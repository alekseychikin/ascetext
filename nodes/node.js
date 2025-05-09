export default class Node {
	constructor(type, attributes = {}, params = {}) {
		this.id = 0
		this.type = type
		this.attributes = attributes
		this.params = params
		this.isContainer = false
		this.isWidget = false
		this.isSection = false
		this.isRendered = false
		this.isMount = false
		this.length = 0
		this.childrenAmount = 0
		this.trimWhiteSpaces = true
	}

	get shortrcuts() {
		return {}
	}

	get isFirst() {
		return this.parent && this.parent.first === this
	}

	get isLast() {
		return this.parent && this.parent.last === this
	}

	split(builder, next) {
		const duplicate = builder.create(this.type, { ...this.attributes })

		builder.append(this.parent, duplicate, this.next)
		builder.append(duplicate, next)

		return {
			head: this,
			tail: duplicate
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
					return
				}

				if (current.contains(this)) {
					continue
				}
			}

			if (current.isContainer) {
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
					return
				}

				if (current.contains(this)) {
					continue
				}
			}

			if (current.isContainer) {
				return current
			}
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
