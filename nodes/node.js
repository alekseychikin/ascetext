import { setNode } from '../utils/map-element-to-node.js'

let id = 1

function hasGroupParent(node) {
	let current = node

	while (current) {
		if (current.isGroup) {
			return true
		}

		current = current.parent
	}

	return false
}

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
		this.isMount = false
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

	get shortrcuts() {
		return {}
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
				(current.parent.isSection || hasGroupParent(current)) &&
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
				(current.parent.isSection || hasGroupParent(current)) &&
				(current.isContainer || current.isWidget)
			) {
				return current
			}
		}
	}

	getLastNode() {
		let current = this

		while (current.next) {
			current = current.next
		}

		return current
	}

	duplicate(builder) {
		return builder.create(this.type, this.attributes)
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
