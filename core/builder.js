import { operationTypes } from '../core/timetravel'
import isElementBr from '../utils/is-element-br'
import isHtmlElement from '../utils/is-html-element'
import Fragment from '../nodes/fragment'

const ignoreParsingElements = ['style', 'script']
const nbsCode = '\u00A0'

export default class Builder {
	constructor(core) {
		this.core = core

		this.parse = this.parse.bind(this)
		this.connectWithNormalize = this.connectWithNormalize.bind(this)
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

		if (typeof target.update === 'function') {
			target.update(previous)
		}
	}

	parse(element) {
		// debugger
		const container = this.createFragment()
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

			// if (current) {
			// 	if (current.isDeleteEmpty && !current.first) {
			// 		current = previous
			// 	} else {
			// 		if (!first) {
			// 			first = current
			// 		}

			// 		if (previous && (normalized = this.connectWithNormalize(previous, current))) {
			// 			if (first === previous) {
			// 				first = normalized
			// 			}

			// 			current = normalized
			// 		}
			// 	}

			// 	previous = current.getLastNode()
			// } else if (currentElement.parentNode) {
			// 	currentElement.parentNode.removeChild(currentElement)
			// }

			// if (currentElement === lastElement) {
			// 	if (isElementBr(lastElement) && lastElement.previousSibling && !isElementBr(lastElement.previousSibling)) {
			// 		this.cut(previous)
			// 	}

			// 	break
			// }

			currentElement = nextElement
		}

		return container
	}

	connectWithNormalize(previous, current) {
		let normalized

		if (
			typeof previous.normalize === 'function' &&
			(normalized = previous.normalize(current, this))
		) {
			if (current.next) {
				this.connect(normalized, current.next)
			}

			this.replaceUntil(previous, normalized)

			return normalized
		}

		this.connect(previous, current)

		return false
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
		let tail

		if (target.type === 'fragment') {
			this.append(node, target.first, anchor)
		} else {
			// console.log('append', node, target)
			// Нужно добавлять по одному. Проверять, можно ли воткнуть в текущий контейнер
			// логику взять из insert
			while (current) {
				next = current.next

				if (!this.canAccept(container, current)) {
					debugger
				}

				if (current.type === 'paragraph') {
					// debugger
				}

				// debugger
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
				// 	this.append(container, current, tail)

					if (typeof container.append === 'function') {
						container.append(current, tail, { builder: this, appendDefault: this.appendHandler })
					} else {
						this.appendHandler(container, current, tail)
					}
				} else {
					this.cut(current)
					console.log('can not accept', container, current)
				}

				// if (current.next === tail && current.isContainer && tail.isContainer) {
				// 	this.append(tail.parent, current.first, tail.first)
				// 	this.cut(current)

				// 	break
				// }

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

	preconnect(node, target) {
		console.error('used preconnect')
		const last = target.getNodeUntil()
		let current = target

		this.cutUntil(target)

		this.core.onNodeChange({
			type: operationTypes.PRECONNECT,
			next: node,
			target,
			last
		})

		if (node.parent) {
			do {
				current.parent = node.parent
				node.parent.element.insertBefore(current.element, node.element)
				this.handleMount(current)
				current = current.next
			} while (current)
		}

		if (node.previous) {
			node.previous.next = target
			target.previous = node.previous
		} else if (node.parent) {
			node.parent.first = target
		}

		last.next = node
		node.previous = last
	}

	connect(node, target) {
		console.error('used connect')
		const last = target.getNodeUntil()
		let current = target

		this.cutUntil(target)

		this.core.onNodeChange({
			type: operationTypes.CONNECT,
			previous: node,
			target,
			last
		})

		if (node.parent) {
			do {
				current.parent = node.parent

				if (node.next) {
					node.parent.element.insertBefore(current.element, node.next.element)
				} else {
					node.parent.element.appendChild(current.element)
				}

				this.handleMount(current)
				current = current.next
			} while (current)
		}

		if (node.next) {
			node.next.previous = last
			last.next = node.next
		} else if (node.parent) {
			node.parent.last = last
		}

		node.next = target
		target.previous = node
	}

	cut(node) {
		if (typeof node.cut === 'function') {
			node.cut({ builder: this })
		// } else if (node.isContainer || node.isWidget) {
		// 	if (node.parent && node.parent.isSection) {
		// 		this.cutUntil(node, node)
		// 	}
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

			if (typeof node.onMount === 'function') {
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
			if (typeof node.onUnmount === 'function') {
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
		// console.groupCollapsed('replaceUntil', node, target)

		this.append(node.parent, target, node.next)
		this.cutUntil(node, until)

		// console.groupEnd()
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
		// let current = target
		// let next
		// let container = node
		// let duplicate

		this.append(node, target, tail)
		// while (current) {
		// 	next = current.next

		// 	if (this.canAccept(container, current)) {
		// 		while (!current.accept(container)) {
		// 			if (tail && (!container.isContainer || !container.isEmpty)) {
		// 				duplicate = container.duplicate(this)
		// 				this.append(duplicate, tail)
		// 			}

		// 			head = container
		// 			tail = head.next
		// 			container = container.parent
		// 		}

		// 		if (current.isContainer && node === head) {
		// 			this.append(head, current.first)
		// 			node = null
		// 		} else {
		// 			this.cut(current)
		// 			this.append(container, current, head ? head.next : null)
		// 			head = current
		// 		}
		// 	} else {
		// 		console.log('can not accept', container, current)
		// 	}

		// 	if (current.next === tail && current.isContainer && tail.isContainer) {
		// 		this.append(tail.parent, current.first, tail.first)
		// 		this.cut(current)

		// 		break
		// 	}

		// 	current = next
		// }
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
			// eslint-disable-next-line no-loop-func
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
