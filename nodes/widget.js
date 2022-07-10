const Paragraph = require('../plugins/paragraph').Paragraph
const BreakLine = require('../plugins/break-line').BreakLine
const WithControls = require('./with-controls')

class Widget extends WithControls {
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
			const paragraph = builder.create('paragraph')

			builder.preconnect(anchorContainer, paragraph)
			setSelection(paragraph, 0)
		}

		builder.cut(anchorContainer)

		if (previousNode) {
			if (previousNode.isWidget) {
				setSelection(previousNode, 0)
			} else {
				const offset = previousNode.getOffset()

				setSelection(previousNode, offset)
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
			const paragraph = builder.create('paragraph')

			builder.preconnect(anchorContainer, paragraph)
			setSelection(paragraph, 0)
		}

		builder.cut(anchorContainer)

		if (nextNode) {
			setSelection(nextNode, 0)
		}
	}

	enterHandler(event, { builder, anchorContainer, setSelection }) {
		event.preventDefault()

		if (!this.parent.isSection) {
			return false
		}

		const paragraph = builder.create('paragraph')

		if (event.shiftKey) {
			builder.preconnect(anchorContainer, paragraph)
		} else {
			builder.connect(anchorContainer, paragraph)
		}

		setSelection(paragraph, 0)
	}

	transform() {}

	update() {}
}

module.exports = Widget
