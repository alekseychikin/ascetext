const operationTypes = require('../core/timetravel').operationTypes

const mapElementToNode = {}
let id = 1

function getNodeByElement(element) {
	let currentElement = element

	while (currentElement) {
		if (mapElementToNode[currentElement.nodeId]) {
			return mapElementToNode[currentElement.nodeId]
		}

		currentElement = currentElement.parentNode
	}

	return false
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
		mapElementToNode[this.id] = this
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

		if (this.isWidget && !offset) {
			return this.element
		}

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

	duplicate(builder) {
		// eslint-disable-next-line no-proto
		const duplicate = builder.create(this.type, this.attributes)

		builder.connect(this, duplicate)

		return duplicate
	}

	split(offset, builder) {
		const selectedChild = this.getChildByOffset(offset)
		let nodeChild = getNodeByElement(selectedChild)

		while (nodeChild.parent !== this) {
			nodeChild = nodeChild.parent
		}

		const nodeChildOffset = offset - this.getOffset(nodeChild.element)
		const { tail } = builder.split(nodeChild, nodeChildOffset)
		const duplicate = this.duplicate(builder)

		builder.append(duplicate, tail)

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
