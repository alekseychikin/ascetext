const pushChange = require('../timetravel').pushChange
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

		node.handleEmptyContainer()
		node.cutUntil()

		if (this.isMount) {
			pushChange({
				type: operationTypes.APPEND,
				target: node,
				last
			})
		}

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
		this.emitOnUpdate()
	}

	// TODO: объединить с append
	push(node) {
		node.handleEmptyContainer()
		node.cut()

		if (this.isMount) {
			pushChange({
				type: operationTypes.APPEND,
				target: node,
				last: node
			})
		}

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

		this.emitOnUpdate()
	}

	preconnect(node) {
		let last = node.getNodeUntil()
		let current = node

		this.handleEmptyContainer()
		node.handleEmptyContainer()
		node.cutUntil()

		if (this.parent) {
			if (this.parent.isMount) {
				pushChange({
					type: operationTypes.PRECONNECT,
					next: this,
					target: node,
					last
				})
			}

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
		this.emitOnUpdate()
	}

	connect(node) {
		const last = node.getNodeUntil()
		let current = node

		this.handleEmptyContainer()
		node.handleEmptyContainer()
		node.cutUntil()

		if (this.parent) {
			if (this.parent.isMount) {
				pushChange({
					type: operationTypes.CONNECT,
					target: node,
					last
				})
			}

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
		this.emitOnUpdate()
	}

	cut() {
		this.cutUntil(this)
	}

	cutUntil(nodeUntil) {
		const last = this.getNodeUntil(nodeUntil)
		const parent = this.parent
		let current = this

		if (this.parent && this.parent.isMount) {
			pushChange({
				type: operationTypes.CUT,
				container: this.parent,
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

		if (parent) {
			parent.handleEmptyContainer()
			parent.emitOnUpdate()
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

	handleEmptyContainer() {
		if (this.isContainer && this.element.firstChild === null) {
			this.element.appendChild(document.createElement('br'))
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
		let node = this
		let next

		if (this.previous) {
			this.previous.connect(newNode)
		} else {
			this.preconnect(newNode)
		}

		node.cutUntil(replaceUntil)

		if (this.onReplace) {
			this.onReplace(newNode)
		}
	}

	get hasOnlyBr() {
		return this.element.firstChild &&
			this.element.firstChild === this.element.lastChild &&
			this.element.firstChild.nodeType === 1 &&
			this.element.firstChild.tagName.toLowerCase() === 'br'
	}

	getClosestContainer() {
		let container = this

		while (!container.isContainer && !container.isWidget) {
			container = container.parent
		}

		return container
	}

	get firstChild() {
		return this.element.firstChild
	}

	get lastChild() {
		return this.element.lastChild
	}

	findFirstContainerNode() {
		let current = this

		while (current && !current.isContainer) {
			current = current.first
		}

		return current
	}

	findFirstTextElement() {
		let element = this.element

		while (element && element && element.nodeType !== 3) {
			element = element.firstChild
		}

		return element
	}

	findLastTextElement() {
		let element = this.element

		while (element && element.nodeType !== 3) {
			element = element.lastChild
		}

		return element
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
		const [ offset ] = this.calcOffset(this.element, element)

		return offset
	}

	calcOffset(container, element) {
		let offset = 0
		let i

		for (i = 0; i < container.childNodes.length; i++) {
			if (container.childNodes[i] === element) {
				return [ offset, true ]
			}

			if (container.childNodes[i].nodeType === 3) {
				offset += container.childNodes[i].length
			} else if (
				container.childNodes[i].nodeType === 1 &&
				container.childNodes[i].tagName.toLowerCase() === 'br' &&
				container.lastChild !== container.childNodes[i]
			) {
				offset += 1
			} else if (container.childNodes[i].childNodes) {
				const [ subOffset, returnOffset ] = this.calcOffset(container.childNodes[i], element)

				offset += subOffset

				if (returnOffset) {
					return [ offset, true ]
				}
			}
		}

		return [ offset, false ]
	}

	getChildByOffset(offset, container = this.element) {
		let restOffset = offset
		let i

		for (i = 0; i < container.childNodes.length; i++) {
			if (container.childNodes[i].nodeType === 3) {
				if (container.childNodes[i].length >= restOffset) {
					return [ container.childNodes[i], restOffset ]
				} else {
					restOffset -= container.childNodes[i].length
				}
			} else if (
				container.childNodes[i].nodeType === 1 &&
				container.childNodes[i].tagName.toLowerCase() === 'br'
			) {
				if (restOffset === 0) {
					return [ container.childNodes[i], restOffset ]
				} else {
					restOffset -= 1
				}
			} else if (container.childNodes[i].childNodes) {
				const [ subChild, subRestOffset ] = this.getChildByOffset(restOffset, container.childNodes[i])

				if (subChild) {
					return [ subChild, subRestOffset ]
				} else {
					restOffset = subRestOffset
				}
			}
		}

		return [ void 0, restOffset ]
	}

	getLastNode() {
		let current = this

		while (current.next) {
			current = current.next
		}

		return current
	}

	duplicate() {
		throw new Error(`Plugin ${this.__proto__.constructor.name} must implement method duplicate`)
	}

	split(position) {
		const container = this.getClosestContainer()
		const [ selectedChild ] = this.getChildByOffset(position)
		let nodeChild = getNodeByElement(selectedChild)

		while (nodeChild.parent !== this) {
			nodeChild = nodeChild.parent
		}

		const nodeChildPosition = position - this.getOffset(nodeChild.element)
		const { head, tail } = nodeChild.split(nodeChildPosition)

		if (tail !== null) {
			if (head !== null || tail.previous) {
				const duplicate = this.duplicate()

				duplicate.append(tail)
				container.isChanged = true

				return {
					head: this,
					tail: duplicate
				}
			}

			return {
				head: null,
				tail: this
			}
		}

		if (head.next) {
			const duplicate = this.duplicate()

			duplicate.append(head.next)

			return {
				head: this,
				tail: duplicate
			}
		}

		return {
			head: this,
			tail: null
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

	emitOnUpdate() {
		let current = this

		while (current.parent) {
			current = current.parent
		}

		if (current.onUpdate) {
			current.onUpdate()
		}
	}
}

module.exports = Node
module.exports.getNodeByElement = getNodeByElement
