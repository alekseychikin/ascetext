import { operationTypes } from '../core/timetravel'
import isElementBr from '../utils/is-element-br'
import isHtmlElement from '../utils/is-html-element'
import isFunction from '../utils/is-function'
import Fragment from '../nodes/fragment'

const ignoreParsingElements = ['style', 'script']
const nbsCode = '\u00A0'

export default class Builder {
	constructor(core) {
		this.core = core

		this.parse = this.parse.bind(this)
		this.appendHandler = this.appendHandler.bind(this)
		this.handleMount = this.handleMount.bind(this)
		this.handleUnmount = this.handleUnmount.bind(this)
	}

	create(name, ...params) {
		const node = this.core.plugins[name].create(...params)
		const element = node.render()

		node.setElement(element)

		if (node.isContainer) {
			this.append(node, this.create('breakLine'))
		}

		return node
	}

	createBlock() {
		return this.create('paragraph')
	}

	createFragment() {
		return new Fragment()
	}

	setAttribute(node, name, value) {
		const previous = { ...node.attributes }

		node.attributes[name] = value
		this.handleAttributes(node, previous, node.attributes)
	}

	setAttributes(node, attributes) {
		const previous = { ...node.attributes }

		node.attributes = attributes
		this.handleAttributes(node, previous, attributes)
	}

	handleAttributes(target, previous, next) {
		this.core.onNodeChange({
			type: operationTypes.ATTRIBUTE,
			target,
			previous,
			next
		})

		if (isFunction(target.update)) {
			target.update(previous)
		}
	}

	parse(element) {
		const container = this.createFragment()
		const lastElement = element.lastChild
		let currentElement = element.firstChild
		let nextElement
		let children = null
		let current

		while (currentElement) {
			if (ignoreParsingElements.includes(currentElement.nodeName.toLowerCase())) {
				currentElement = currentElement.nextSibling

				continue
			}

			nextElement = currentElement.nextSibling
			children = null

			if (isHtmlElement(currentElement) && currentElement.childNodes.length) {
				children = this.parse(currentElement)
			}

			current = Object.keys(this.core.plugins).reduce((parsed, pluginName) => {
				if (parsed) return parsed

				return this.core.plugins[pluginName].parse(currentElement, this, children)
			}, null)

			if (current) {
				this.append(container, current)

				if (children && children.first) {
					this.append(current, children)
				}

				if (current.isDeleteEmpty && !current.first) {
					this.cut(current)
				}
			} else if (children && children.first) {
				this.append(container, children)
			}

			if (currentElement === lastElement) {
				if (isElementBr(lastElement) && lastElement.previousSibling && !isElementBr(lastElement.previousSibling)) {
					this.cut(current)
				}

				break
			}

			currentElement = nextElement
		}

		this.normalize(container)

		return container
	}

	normalize(node) {
		let current = node.first
		let next
		let normalized

		while (current) {
			next = current.next

			if (current.previous && isFunction(current.previous.normalize)) {
				if (normalized = current.previous.normalize(current, this)) {
					if (current.previous.first) {
						this.append(normalized, current.previous.first)
					}

					if (current.first) {
						this.append(normalized, current.first)
					}

					this.replaceUntil(current.previous, normalized, current)
					this.normalize(normalized)
				}
			}

			current = next
		}
	}

	split(container, offset) {
		const firstLevelNode = container.getFirstLevelNode(offset)

		return firstLevelNode.split(offset - container.getOffset(firstLevelNode.element), this)
	}

	push(node, target) {
		this.cut(target)
		this.append(node, target)
	}

	append(node, target, anchor) {
		let container = node
		let current = target
		let next
		let tail = anchor

		if (target.type === 'fragment') {
			this.append(node, target.first, anchor)
		} else {
			while (current) {
				next = current.next

				if (this.canAccept(container, current)) {
					while (!container.accept(current)) {
						// if (tail && (!container.isContainer || !container.isEmpty)) {
						// 	duplicate = container.duplicate(this)
						// 	this.append(duplicate, tail)
						// }

						tail = container.next
						container = container.parent
					}

					this.cut(current)

					if (isFunction(container.append)) {
						container.append(current, tail, { builder: this, appendDefault: this.appendHandler })
					} else {
						this.appendHandler(container, current, tail)
					}
				} else {
					this.cut(current)
					console.log('can not accept', container, current)
				}

				current = next
			}
		}
	}

	appendHandler(node, target, anchor) {
		const last = target.getNodeUntil()
		let current = target

		this.cutUntil(target, last)

		this.core.onNodeChange({
			type: operationTypes.APPEND,
			container: node,
			target,
			last,
			anchor
		})

		do {
			current.parent = node

			if (anchor) {
				node.element.insertBefore(current.element, anchor.element)
			} else {
				node.element.appendChild(current.element)
			}

			this.handleMount(current)
			current = current.next
		} while (current)

		if (!node.first) {
			node.first = target
		} else if (anchor) {
			if (anchor.previous) {
				target.previous = anchor.previous
				anchor.previous.next = target
			} else {
				node.first = target
			}

			last.next = anchor
			anchor.previous = last
		} else {
			node.last.next = target
			target.previous = node.last
		}

		if (!anchor) {
			node.last = last
		}
	}

	cut(node) {
		if (isFunction(node.cut)) {
			node.cut({ builder: this })
		} else {
			this.cutUntil(node, node)
		}
	}

	cutUntil(node, until) {
		const last = node.getNodeUntil(until)
		const parent = node.parent
		const isContainer = parent && parent.isContainer
		let current = node

		if (node.previous) {
			this.core.editing.markDirty(node.previous)
		}

		if (node.parent || node.previous || last.next) {
			this.core.onNodeChange({
				type: operationTypes.CUT,
				container: node.parent,
				until: last,
				anchor: last.next,
				previous: node.previous,
				next: last.next,
				target: node
			})
		}

		if (current.previous) {
			this.handleText(current)

			if (current.parent && current.parent.last === last) {
				current.parent.last = current.previous
			}

			if (last.next) {
				current.previous.next = last.next
				last.next.previous = current.previous
			} else {
				delete current.previous.next
			}
		} else if (last.next) {
			if (current.parent) {
				current.parent.first = last.next
			}

			delete last.next.previous
		} else if (current.parent) {
			delete current.parent.first
			delete current.parent.last
		}

		delete current.previous
		delete last.next

		while (current) {
			if (current.element.parentNode) {
				current.element.parentNode.removeChild(current.element)
			}

			this.handleUnmount(current)
			delete current.parent

			if (current === last) {
				break
			}

			current = current.next
		}

		if (isContainer && !parent.first && node.type !== 'breakLine') {
			this.append(parent, this.create('breakLine'))
		}
	}

	handleMount(node) {
		let current = node
		let hasRoot = false

		do {
			if (current.type === 'root') {
				hasRoot = true
				break
			}

			current = current.parent
		} while (current)

		if (hasRoot && !node.isMount) {
			node.isMount = true

			if (isFunction(node.onMount)) {
				node.onMount(this.core)
			}

			current = node.first

			while (current) {
				this.handleMount(current)
				current = current.next
			}
		}
	}

	handleUnmount(node) {
		let current

		if (node.isMount) {
			if (isFunction(node.onUnmount)) {
				node.onUnmount(this.core)
			}

			node.isMount = false
			current = node.first

			while (current) {
				this.handleUnmount(current)
				current = current.next
			}
		}
	}

	handleText(current) {
		const firstChild = current.deepesetFirstNode()
		const lastChild = current.previous.deepesetLastNode()

		if (firstChild && firstChild.type === 'text' && firstChild.content[0] === ' ') {
			firstChild.content = nbsCode + firstChild.content.substr(1)
			firstChild.element.nodeValue = firstChild.content
		}

		if (lastChild && lastChild.type === 'text' && lastChild.content[lastChild.content.length - 1] === ' ') {
			lastChild.content = lastChild.content.substr(0, lastChild.content.length - 1) + nbsCode
			lastChild.element.nodeValue = lastChild.content
		}
	}

	replace(node, target) {
		this.replaceUntil(node, target, node)
	}

	replaceUntil(node, target, until) {
		const parent = node.parent
		const next = until.next

		this.cutUntil(node, until)
		this.append(parent, target, next)
	}

	canAccept(container, current) {
		if (container.accept(current)) {
			return container
		}

		if (container.parent) {
			return this.canAccept(container.parent, current)
		}

		return false
	}

	insert(node, target, offset) {
		const { tail } = this.split(node, offset)

		this.append(node, target, tail)
	}

	moveTail(container, target, offset) {
		const { tail } = this.split(container, offset)

		if (tail) {
			this.append(target, tail)
		}
	}

	parseJson(body) {
		let first
		let previous
		let current

		body.forEach((element) => {
			current = Object.keys(this.core.plugins).reduce((parsed, pluginName) => {
				if (parsed) return parsed

				return this.core.plugins[pluginName].parseJson(element, this)
			}, false)

			if (current) {
				if (!first) {
					first = current
				} else {
					this.connect(previous, current)
				}

				previous = current.getLastNode()
			} else {
				console.log('not matched', element)
			}
		})

		return first
	}
}
