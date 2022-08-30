import WithControls from './with-controls'

export default class Widget extends WithControls {
	constructor(type, attributes) {
		super(type, attributes)

		this.isWidget = true
	}

	renderElement() {
		super.renderElement()

		this.element.setAttribute('data-widget', '')
	}

	backspaceHandler(event, { builder, anchorContainer, setSelection }) {
		event.preventDefault()

		if (!this.parent.isSection) {
			return false
		}

		const previousNode = anchorContainer.previous

		if (!previousNode) {
			const newBlock = builder.createBlock()

			builder.preconnect(anchorContainer, newBlock)
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

			builder.preconnect(anchorContainer, newBlock)
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

		if (event.shiftKey) {
			builder.preconnect(anchorContainer, newBlock)
		} else {
			builder.connect(anchorContainer, newBlock)
		}

		setSelection(newBlock)
	}

	markDirty() {}

	update() {}
}
