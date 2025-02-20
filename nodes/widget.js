import Node from './node.js'

export default class Widget extends Node {
	constructor(type, attributes, params) {
		super(type, attributes, params)

		this.isWidget = true
	}

	backspaceHandler(event, { builder, anchorContainer, setSelection }) {
		event.preventDefault()

		if (!this.parent.isSection) {
			return false
		}

		const previousNode = anchorContainer.previous

		if (!previousNode) {
			const newBlock = builder.createBlock()

			builder.append(anchorContainer.parent, newBlock, anchorContainer)
			setSelection(newBlock)
		}

		builder.cut(anchorContainer)

		if (previousNode) {
			if (previousNode.isWidget) {
				setSelection(previousNode)
			} else {
				setSelection(previousNode, -1)
			}
		}
	}

	deleteHandler(event, { builder, anchorContainer, setSelection }) {
		event.preventDefault()

		if (!this.parent.isSection) {
			return false
		}

		const nextNode = anchorContainer.next

		if (!nextNode) {
			const newBlock = builder.createBlock()

			builder.append(anchorContainer.parent, newBlock, anchorContainer)
			setSelection(newBlock)
		}

		builder.cut(anchorContainer)

		if (nextNode) {
			setSelection(nextNode)
		}
	}

	enterHandler(event, { builder, anchorContainer, setSelection }) {
		event.preventDefault()

		if (!this.parent.isSection) {
			return false
		}

		const newBlock = builder.createBlock()

		builder.append(anchorContainer.parent, newBlock, event.shiftKey ? anchorContainer : anchorContainer.next)
		setSelection(newBlock)
	}

	split(builder) {
		let next = this.next

		if (!next) {
			next = builder.createBlock()
			builder.append(this.parent, next)
		}

		return {
			head: this,
			tail: next
		}
	}
}
