import { operationTypes } from '../core/timetravel'
import isElementBr from '../utils/is-element-br'

const ignoreParsingElements = ['style', 'script']
const nbsCode = '\u00A0'

export default class Builder {
	constructor(core) {
		this.core = core

		this.parse = this.parse.bind(this)
		this.connectWithNormalize = this.connectWithNormalize.bind(this)
		this.appendHandler = this.appendHandler.bind(this)
	}

	create(name, ...params) {
		const node = this.core.plugins[name].create(...params)

		if (node.isContainer) {
			this.append(node, this.create('breakLine'))
		}

		return node
	}

	createBlock() {
		return this.create('paragraph')
	}

	split(container, offset) {
		const firstLevelNode = container.getFirstLevelNode(offset)

		return firstLevelNode.split(offset - container.getOffset(firstLevelNode.element), this)
	}

	push(node, target) {
		this.append(node, target, target)
	}

	append(node, target, last) {
		if (typeof node.append === 'function') {
			node.append(target, last, { builder: this, appendDefault: this.appendHandler })
		} else {
			this.appendHandler(node, target, last)
		}
	}

	appendHandler(node, target, last) {
		let current = target

		last = last || target.getNodeUntil()

		this.cutUntil(target, last)

		this.core.onNodeChange({
			type: operationTypes.APPEND,
			container: node,
			target,
			last
		})

		if (!node.first) {
			node.first = target
		} else {
			node.last.next = target
			target.previous = node.last
		}

		while (current) {
			current.parent = node
			node.element.appendChild(current.element)
			current = current.next
		}

		node.last = last
	}

	preconnect(node, target) {
		const last = target.getNodeUntil()
		let current = target

		// console.log('preconnect', node, target)

		this.cutUntil(target)

		this.core.onNodeChange({
			type: operationTypes.PRECONNECT,
			next: node,
			target,
			last
		})

		// console.groupEnd()

		if (node.parent) {
			do {
				current.parent = node.parent
				node.parent.element.insertBefore(current.element, node.element)

				if (!current.next) {
					break
				}

				current = current.next
			} while (true) // eslint-disable-line no-constant-condition
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
		const last = target.getNodeUntil()
		let current = target

		// console.log('connect', node, target)

		this.cutUntil(target)

		this.core.onNodeChange({
			type: operationTypes.CONNECT,
			previous: node,
			target,
			last
		})

		// console.groupEnd()

		if (node.parent) {
			do {
				current.parent = node.parent

				if (node.next) {
					node.parent.element.insertBefore(current.element, node.next.element)
				} else {
					node.parent.element.appendChild(current.element)
				}

				if (!current.next) {
					break
				}

				current = current.next
			} while (true) // eslint-disable-line no-constant-condition
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
		} else if (node.isContainer || node.isWidget) {
			if (node.parent.isSection) {
				this.cutUntil(node, node)
			}
		} else {
			this.cutUntil(node, node)
		}
	}

	cutUntil(node, until) {
		const last = node.getNodeUntil(until)
		const parent = node.parent
		const isContainer = parent && parent.isContainer
		let current = node
		let content

		if (node.previous) {
			this.core.editing.markDirty(node.previous)
		}

		if (node.parent || node.previous || last.next) {
			this.core.onNodeChange({
				type: operationTypes.CUT,
				container: node.parent,
				until: last,
				previous: node.previous,
				next: last.next,
				target: node
			})
		}

		if (current.previous) {
			const firstChild = current.deepesetFirstNode()
			const lastChild = current.previous.deepesetLastNode()

			if (firstChild && firstChild.type === 'text' && firstChild.content[0] === ' ') {
				content = nbsCode + firstChild.content.substr(1)
				firstChild.content = content
				firstChild.element.nodeValue = content
			}

			if (lastChild && lastChild.type === 'text' && lastChild.content[lastChild.content.length - 1] === ' ') {
				content = lastChild.content.substr(0, lastChild.content.length - 1) + nbsCode
				lastChild.content = content
				lastChild.element.nodeValue = content
			}

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

	replace(node, target) {
		this.replaceUntil(node, target, node)
	}

	replaceUntil(node, target, until) {
		// console.groupCollapsed('replaceUntil', node, target)

		if (node.previous) {
			this.connect(node.previous, target)
		} else {
			this.preconnect(node, target)
		}

		this.cutUntil(node, until)

		// console.groupEnd()
	}

	insert(container, node, offset) {
		const { head, tail } = this.split(container, offset)

		if (head) {
			this.connect(head, node)

			return node
		}

		this.preconnect(tail, node)

		return tail
	}

	moveTail(container, target, offset) {
		const { tail } = this.split(container, offset)

		if (tail) {
			this.append(target, tail)
		}
	}

	parse(firstElement, lastElement, context = { selection: this.selection }) {
		let currentElement = firstElement
		let nextElement
		let first
		let previous
		let current
		let value

		while (currentElement) {
			// eslint-disable-next-line no-loop-func
			current = Object.keys(this.core.plugins).reduce((parsed, pluginName) => {
				if (parsed) return parsed

				return this.core.plugins[pluginName].parse(currentElement, this, context)
			}, false)

			if (
				!current &&
				!ignoreParsingElements.includes(currentElement.nodeName.toLowerCase()) &&
				currentElement.childNodes.length
			) {
				current = this.parse(currentElement.firstChild, currentElement.lastChild, context)
			}

			nextElement = currentElement.nextSibling

			if (current) {
				value = this.handleParseNext(first, previous, current)

				previous = value.current
				first = value.first
			} else {
				console.log('not matched', currentElement)

				if (currentElement.parentNode) {
					currentElement.parentNode.removeChild(currentElement)
				}
			}

			if (currentElement === lastElement) {
				if (isElementBr(lastElement) && lastElement.previousSibling && !isElementBr(lastElement.previousSibling)) {
					this.cut(previous)
				}

				break
			}

			currentElement = nextElement
		}

		return first
	}

	handleParseNext(first, previous, current) {
		if (current.isDeleteEmpty && !current.first) {
			return { first, current: previous }
		}

		if (!first) {
			first = current
		}

		if (previous) {
			this.connectWithNormalize(previous, current, (normalized) => {
				if (first === previous) {
					first = normalized
				}

				current = normalized
			})
		}

		return { first, current: current.getLastNode() }
	}

	connectWithNormalize(previous, current, callback) {
		let normalized

		if (
			previous.type === current.type && previous.normalize &&
			(normalized = previous.normalize(current, this))
		) {
			if (current.next) {
				this.connect(normalized, current.next)
			}

			this.replaceUntil(previous, normalized)

			if (typeof (callback) === 'function') {
				callback(normalized)
			}
		} else if ((previous.isContainer || previous.isWidget) && (!current.isContainer && !current.isWidget && !current.isGroup)) {
			const block = this.createBlock()

			this.append(block, current)
			this.connect(previous, block)

			if (typeof (callback) === 'function') {
				callback(block)
			}
		} else {
			this.connect(previous, current)
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
