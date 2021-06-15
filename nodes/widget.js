const Paragraph = require('../plugins/paragraph').Paragraph
const BreakLine = require('../plugins/break-line').BreakLine
const WithControls = require('./with-controls')

class Widget extends WithControls {
	constructor(core, type) {
		super(core, type)

		this.isWidget = true
	}

	renderElement() {
		super.renderElement()

		this.element.setAttribute('data-widget', '')
	}

	backspaceHandler(event) {
		event.preventDefault()

		if (!this.parent.isSection) {
			return false
		}

		const container = this.core.selection.anchorContainer
		const previousNode = container.previous

		if (!previousNode) {
			const paragraph = new Paragraph(this.core)

			container.preconnect(paragraph)
			this.core.selection.setSelection(paragraph, 0)
		}

		container.cut()

		if (previousNode) {
			if (previousNode.isWidget) {
				this.core.selection.setSelection(previousNode, 0)
			} else {
				const offset = previousNode.getOffset()

				this.core.selection.setSelection(previousNode, offset)
			}
		}
	}

	deleteHandler(event) {
		event.preventDefault()

		if (!this.parent.isSection) {
			return false
		}

		const container = this.core.selection.anchorContainer
		const nextNode = container.next

		if (!nextNode) {
			const paragraph = new Paragraph(this.core)

			container.preconnect(paragraph)
			this.core.selection.setSelection(paragraph, 0)
		}

		container.cut()

		if (nextNode) {
			this.core.selection.setSelection(nextNode, 0)
		}
	}

	enterHandler(event) {
		event.preventDefault()

		if (!this.parent.isSection) {
			return false
		}

		const container = this.core.selection.anchorContainer
		const paragraph = new Paragraph(this.core)

		paragraph.append(new BreakLine(this.core))

		if (event.shiftKey) {
			container.preconnect(paragraph)
		} else {
			container.connect(paragraph)
		}

		this.core.selection.setSelection(paragraph, 0)
	}

	transform() {}

	update() {}
}

module.exports = Widget
