const operationTypes = require('../timetravel').operationTypes

const mapElementToNode = []

function getNodeByElement(element) {
	let currentElement = element
	let i

	while (currentElement) {
		for (i = 0; i < mapElementToNode.length; i++) {
			if (mapElementToNode[i].element === currentElement) {
				return mapElementToNode[i]
			}
		}

		currentElement = currentElement.parentNode
	}
}

function walk(rootElement, callback) {
	let returnValue
	let current = rootElement.firstChild

	while (current && current !== rootElement) {
		returnValue = callback(current)

		if (typeof returnValue !== 'undefined') {
			return returnValue
		}

		if (current.firstChild) {
			current = current.firstChild

			continue
		}

		if (current.nextSibling) {
			current = current.nextSibling

			continue
		}

		if (current.parentNode) {
			current = current.parentNode

			while (current && current !== rootElement) {
				if (current.nextSibling) {
					current = current.nextSibling

					break
				}

				current = current.parentNode
			}
		}
	}
}

class Node {
	constructor(type) {
		this.fields = []
		this.type = type
		this.isContainer = false
		this.isWidget = false
		this.isSection = false
		this.isGroup = false
		this.isDeleteEmpty = false
		this.isMount = false

		mapElementToNode.push(this)
	}

	setElement(element) {
		this.element = element
	}

	append(node) {
		let current = node
		const last = node.getNodeUntil()

		node.cutUntil()

		this.emitNodeChange({
			type: operationTypes.APPEND,
			container: this,
			target: node,
			last
		})

		if (!this.first) {
			this.first = node
		} else {
			this.last.next = node
			node.previous = this.last
		}

		if (this.isContainer && this.hasOnlyBr) {
			this.element.removeChild(this.element.firstChild)
		}

		while (current) {
			current.parent = this
			this.element.appendChild(current.element)

			if (this.isMount) {
				this.setMount(current)
			}

			current = current.next
		}

		this.last = last
	}

	// TODO: объединить с append
	push(node) {
		node.cut()

		this.emitNodeChange({
			type: operationTypes.APPEND,
			container: this,
			target: node,
			last: node
		})

		if (this.last) {
			this.last.next = node
			node.previous = this.last
		} else {
			this.first = node
		}

		this.last = node
		node.parent = this

		if (this.isContainer && this.hasOnlyBr) {
			this.element.removeChild(this.element.firstChild)
		}

		this.element.appendChild(node.element)

		if (this.isMount) {
			this.setMount(node)
		}
	}

	preconnect(node) {
		const last = node.getNodeUntil()
		let current = node

		node.cutUntil()

		this.emitNodeChange({
			type: operationTypes.PRECONNECT,
			next: this,
			target: node,
			last
		})

		if (this.parent) {
			do {
				current.parent = this.parent
				this.parent.element.insertBefore(current.element, this.element)

				if (this.parent.isMount) {
					this.setMount(current)
				}

				if (!current.next) {
					break
				}

				current = current.next
			} while (true) // eslint-disable-line no-constant-condition
		}

		if (this.previous) {
			this.previous.next = node
			node.previous = this.previous
		} else if (this.parent) {
			this.parent.first = node
		}

		last.next = this
		this.previous = last
	}

	connect(node) {
		const last = node.getNodeUntil()
		let current = node

		node.cutUntil()

		if (this.parent) {
			this.emitNodeChange({
				type: operationTypes.CONNECT,
				previous: this,
				target: node,
				last
			})

			do {
				current.parent = this.parent

				if (this.next) {
					this.parent.element.insertBefore(current.element, this.next.element)
				} else {
					this.parent.element.appendChild(current.element)
				}

				if (this.parent.isMount) {
					this.setMount(current)
				}

				if (!current.next) {
					break
				}

				current = current.next
			} while (true) // eslint-disable-line no-constant-condition
		}

		if (this.next) {
			this.next.previous = last
			last.next = this.next
		} else if (this.parent) {
			this.parent.last = last
		}

		this.next = node
		node.previous = this
	}

	cut() {
		this.cutUntil(this)
	}

	cutUntil(nodeUntil) {
		const last = this.getNodeUntil(nodeUntil)
		let current = this

		if (this.parent) {
			this.parent.emitNodeChange({
				type: operationTypes.CUT,
				container: this.parent,
				until: last,
				next: last.next,
				target: this
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

			if (current.isMount) {
				if (current.onUnmount) {
					current.onUnmount()
				}

				current.isMount = false
				this.childrenOmitOnUnmount(current.first)
			}

			delete current.parent

			if (current === last) {
				break
			}

			current = current.next
		}
	}

	setMount(node) {
		if (node.onMount) {
			node.onMount()
		}

		node.isMount = true
		this.childrenOmitOnMount(node.first)
	}

	childrenOmitOnMount(node) {
		let current = node

		while (current) {
			if (!current.isMount) {
				if (current.onMount) {
					current.onMount()
				}

				current.isMount = true
				this.childrenOmitOnMount(current.first)
			}

			current = current.next
		}
	}

	childrenOmitOnUnmount(node) {
		let current = node

		while (current) {
			if (current.onUnmount) {
				current.onUnmount()
			}

			current.isMount = false
			this.childrenOmitOnUnmount(current.first)

			current = current.next
		}
	}

	getNodeUntil(nodeUntil) {
		let current = this

		while (current.next) {
			if (current === nodeUntil) {
				return current
			}

			current = current.next
		}

		return current
	}

	replace(newNode) {
		this.replaceUntil(newNode, this)
	}

	replaceUntil(newNode, replaceUntil) {
		if (this.previous) {
			this.previous.connect(newNode)
		} else {
			this.preconnect(newNode)
		}

		this.cutUntil(replaceUntil)

		if (this.onReplace) {
			this.onReplace(newNode)
		}
	}

	emitNodeChange(params) {
		const event = document.createEvent('HTMLEvents')

		event.initEvent('node-change', true, true)
		event.changes = {}

		for (const key in params) {
			event.changes[key] = params[key]
		}

		this.element.dispatchEvent(event)
	}

	get hasOnlyBr() {
		return this.element.firstChild &&
			this.element.firstChild === this.element.lastChild &&
			this.element.firstChild.nodeType === 1 &&
			this.element.firstChild.tagName.toLowerCase() === 'br'
	}

	getClosestContainer() {
		let container = this

		while (container && !container.isContainer && !container.isWidget) {
			container = container.parent
		}

		return container
	}

	getPreviousSelectableNode() {
		let current = this

		while (current) {
			if (current.previous) {
				current = current.previous

				while (current.last) {
					current = current.last
				}
			} else {
				current = current.parent

				if (!current) {
					return false
				}

				if (current.contains(this)) {
					continue
				}
			}

			if (
				(current.parent.isSection || current.parent.isGroup) &&
				(current.isContainer || current.isWidget)
			) {
				return current
			}
		}
	}

	getNextSelectableNode() {
		let current = this

		while (current) {
			if (current.next) {
				current = current.next

				while (current.first) {
					current = current.first
				}
			} else {
				current = current.parent

				if (!current) {
					return false
				}

				if (current.contains(this)) {
					continue
				}
			}

			if (
				(current.parent.isSection || current.parent.isGroup) &&
				(current.isContainer || current.isWidget)
			) {
				return current
			}
		}
	}

	getOffset(element) {
		let index = 0

		walk(this.element, (current) => {
			if (current === element) {
				return true
			}

			if (current.nodeType === 3) {
				index += current.length
			} else if (
				current.nodeType === 1 && current.tagName.toLowerCase() === 'br'
			) {
				if (current === this.element.lastChild) {
					return true
				}

				index += 1
			}
		})

		return index
	}

	getChildByOffset(offset) {
		let restOffset = offset

		return walk(this.element, (current) => {
			if (current.nodeType === 3) {
				if (current.length >= restOffset) {
					return current
				}

				restOffset -= current.length
			} else if (
				current.nodeType === 1 &&
				current.tagName.toLowerCase() === 'br'
			) {
				if (restOffset === 0) {
					return current
				}

				restOffset -= 1
			}
		})
	}

	getFirstLevelNode(offset) {
		const selectedElement = this.getChildByOffset(offset)
		let firstLevelNode = getNodeByElement(selectedElement)

		while (firstLevelNode.parent !== this) {
			firstLevelNode = firstLevelNode.parent
		}

		return firstLevelNode
	}

	getLastNode() {
		let current = this

		while (current.next) {
			current = current.next
		}

		return current
	}

	// не нравится
	duplicate() {
		throw new Error(`Plugin ${this.__proto__.constructor.name} must implement method duplicate`)
	}

	split(position) {
		const selectedChild = this.getChildByOffset(position)
		let nodeChild = getNodeByElement(selectedChild)

		while (nodeChild.parent !== this) {
			nodeChild = nodeChild.parent
		}

		const nodeChildPosition = position - this.getOffset(nodeChild.element)
		const { tail } = nodeChild.split(nodeChildPosition)
		const duplicate = this.duplicate()

		duplicate.append(tail)

		return {
			head: this,
			tail: duplicate
		}
	}

	contains(childNode) {
		let current = childNode

		while (current) {
			if (current === this) {
				return true
			}

			if (current.parent) {
				current = current.parent
			} else {
				return false
			}
		}

		return false
	}

	stringify() {
		return ''
	}
}

module.exports = Node
module.exports.getNodeByElement = getNodeByElement
module.exports.walk = walk
