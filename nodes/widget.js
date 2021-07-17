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

	backspaceHandler(event, { anchorContainer, setSelection }) {
		event.preventDefault()

		if (!this.parent.isSection) {
			return false
		}

		const previousNode = anchorContainer.previous

		if (!previousNode) {
			const paragraph = new Paragraph(this.core)

			anchorContainer.preconnect(paragraph)
			setSelection(paragraph, 0)
		}

		anchorContainer.cut()

		if (previousNode) {
			if (previousNode.isWidget) {
				setSelection(previousNode, 0)
			} else {
				const offset = previousNode.getOffset()

				setSelection(previousNode, offset)
			}
		}
	}

	deleteHandler(event, { anchorContainer, setSelection }) {
		event.preventDefault()

		if (!this.parent.isSection) {
			return false
		}

		const nextNode = anchorContainer.next

		if (!nextNode) {
			const paragraph = new Paragraph()

			anchorContainer.preconnect(paragraph)
			setSelection(paragraph, 0)
		}

		anchorContainer.cut()

		if (nextNode) {
			setSelection(nextNode, 0)
		}
	}

	enterHandler(event, { anchorContainer, setSelection }) {
		event.preventDefault()

		if (!this.parent.isSection) {
			return false
		}

		const paragraph = new Paragraph()

		paragraph.append(new BreakLine())

		if (event.shiftKey) {
			anchorContainer.preconnect(paragraph)
		} else {
			anchorContainer.connect(paragraph)
		}

		setSelection(paragraph, 0)
	}

	transform() {}

	update() {}
}

module.exports = Widget
