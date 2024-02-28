import WithControls from './with-controls.js'

export default class Widget extends WithControls {
	constructor(type, attributes) {
		super(type, attributes)

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

	split() {
		return {
			head: this.previous,
			tail: this
		}
	}

	scheduleUpdate() {}
}
