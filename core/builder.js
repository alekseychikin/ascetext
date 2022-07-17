const operationTypes = require('../core/timetravel').operationTypes

const ignoreParsingElements = ['style', 'script']

class Builder {
	constructor(core) {
		this.core = core

		this.parse = this.parse.bind(this)
		this.connectWithNormalize = this.connectWithNormalize.bind(this)
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

	split(node, offset) {
		return node.split(offset, this)
	}

	append(node, target) {
		const last = target.getNodeUntil()
		let current = target

		if (node.isContainer && node.isEmpty && node.first) {
			this.cut(node.first)
		}

		this.cutUntil(target)

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

		if (node.isContainer && node.hasOnlyBr) {
			node.element.removeChild(node.element.firstChild)
		}

		while (current) {
			current.parent = node
			node.element.appendChild(current.element)
			current = current.next
		}

		node.last = last
	}

	push(node, target) {
		this.cut(target)

		this.core.onNodeChange({
			type: operationTypes.APPEND,
			container: node,
			target,
			last: target
		})

		if (node.last) {
			node.last.next = target
			target.previous = node.last
		} else {
			node.first = target
		}

		node.last = target
		target.parent = node

		if (node.isContainer && node.hasOnlyBr) {
			node.element.removeChild(node.element.firstChild)
		}

		node.element.appendChild(target.element)
	}

	preconnect(node, target) {
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
		return this.cutUntil(node, node)
	}

	cutUntil(node, until) {
		const last = node.getNodeUntil(until)
		let current = node

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
	}

	replace(node, target) {
		this.replaceUntil(node, target, node)
	}

	replaceUntil(node, target, until) {
		console.log('replaceUntil')
		if (node.previous) {
			this.connect(node.previous, target)
		} else {
			this.preconnect(node, target)
		}

		this.cutUntil(node, until)
	}

	insert(container, node, offset) {
		const firstLevelNode = container.getFirstLevelNode(offset)
		const { head } = this.split(firstLevelNode, offset - container.getOffset(firstLevelNode.element))

		this.connect(head, node)
	}

	parse(firstElement, lastElement, context = { selection: this.selection }) {
		let currentElement = firstElement
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
				current = this.parse(currentElement.firstChild, currentElement.lastChild)
			}

			if (current) {
				value = this.handleParseNext(first, previous, current)

				if (value.current && value.current.isContainer) {
					if (!value.current.first) {
						this.push(value.current, this.create('breakLine'))
					} else if (
						value.current.last.type === 'breakLine' &&
						value.current.last.previous &&
						value.current.last.previous.type !== 'breakLine'
					) {
						this.push(value.current, this.create('breakLine'))
					}
				}

				previous = value.current
				first = value.first
			} else {
				console.log('not matched', currentElement)
			}

			if (currentElement === lastElement) {
				break
			}

			currentElement = currentElement.nextSibling
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
			(normalized = previous.normalize(current, this.connectWithNormalize))
		) {
			if (current.next) {
				this.connect(normalized, current.next)
			}

			this.replaceUntil(previous, normalized)

			if (typeof (callback) === 'function') {
				callback(normalized)
			}
		} else {
			this.connect(previous, current)
		}
	}
}

module.exports = Builder
