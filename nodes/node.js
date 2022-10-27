import isElementBr from '../utils/is-element-br'
import isTextElement from '../utils/is-text-element'
import { setNode, getNodeByElement } from '../utils/map-element-to-node'
import walk from '../utils/walk'

let id = 1

export default class Node {
	constructor(type, attributes = {}) {
		this.id = id++
		this.type = type
		this.attributes = attributes
		this.isContainer = false
		this.isWidget = false
		this.isSection = false
		this.isGroup = false
		this.isDeleteEmpty = false
	}

	setElement(element) {
		this.element = element
		this.element.nodeId = this.id
		setNode(this)
	}

	accept() {
		return false
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

	get hasOnlyBr() {
		return this.element.firstChild &&
			this.element.firstChild === this.element.lastChild &&
			isElementBr(this.element.firstChild)
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

			if (isTextElement(current)) {
				index += current.length
			} else if (isElementBr(current)) {
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

		if (this.isWidget && !offset) {
			return { node: this, element: this.element }
		}

		const element = walk(this.element, (current) => {
			if (isTextElement(current)) {
				if (current.length >= restOffset) {
					return current
				}

				restOffset -= current.length
			} else if (isElementBr(current)) {
				if (restOffset === 0) {
					return current
				}

				restOffset -= 1
			}
		})

		return { node: getNodeByElement(element), element }
	}

	getFirstLevelNode(offset) {
		let { node: firstLevelNode } = this.getChildByOffset(offset)

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

	duplicate(builder) {
		// eslint-disable-next-line no-proto
		const duplicate = builder.create(this.type, this.attributes)

		builder.connect(this, duplicate)

		return duplicate
	}

	split(offset, builder) {
		let { node: nodeChild } = this.getChildByOffset(offset)

		while (nodeChild.parent !== this) {
			nodeChild = nodeChild.parent
		}

		const { head, tail } = builder.split(this, offset)

		if (head && tail) {
			const duplicate = this.duplicate(builder)

			builder.append(duplicate, tail)

			return {
				head: this,
				tail: duplicate
			}
		} else if (head) {
			return {
				head: this,
				tail: this.next
			}
		}

		return {
			head: null,
			tail: this
		}
	}

	deepesetLastNode(node = this) {
		if (node.last) {
			return node.last.deepesetLastNode()
		}

		return node
	}

	deepesetFirstNode(node = this) {
		if (node.first) {
			return node.first.deepesetFirstNode()
		}

		return node
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

	json(children) {
		if (children) {
			return {
				type: this.type,
				body: children
			}
		}

		return {
			type: this.type
		}
	}
}
