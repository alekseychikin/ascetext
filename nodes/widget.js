import { Paragraph } from '../plugins/paragraph'
import WithControls from './with-controls'

const listeners = []
let isSetAnimationRequest = false

function animationFrameHandler() {
	isSetAnimationRequest = false
	listeners.forEach((listener) => listener())
}

function windowResizeHandler() {
	if (!isSetAnimationRequest) {
		isSetAnimationRequest = true
		requestAnimationFrame(animationFrameHandler)
	}
}

export default class Widget extends WithControls {
	constructor(type) {
		super(type)

		this.isWidget = true
	}

	renderElement() {
		super.renderElement()

		this.element.setAttribute('data-widget', '')
	}

	backspaceHandler(event, core) {
		event.preventDefault()

		if (!this.parent.isSection) {
			return false
		}

		const container = core.selection.anchorContainer
		const previousNode = container.previous

		if (!previousNode) {
			const paragraph = new Paragraph()

			container.preconnect(paragraph)
			core.selection.setSelection(paragraph.element, 0)
		}

		container.delete()

		if (previousNode) {
			if (previousNode.isWidget) {
				core.selection.setSelection(previousNode.element, 0)
			} else {
				const offset = previousNode.getOffset()

				core.selection.setSelection(previousNode.element, offset)
			}
		}
	}

	deleteHandler(event, core) {
		event.preventDefault()

		if (!this.parent.isSection) {
			return false
		}

		const container = core.selection.anchorContainer
		const nextNode = container.next

		if (!nextNode) {
			const paragraph = new Paragraph()

			container.preconnect(paragraph)
			core.selection.setSelection(paragraph.element, 0)
		}

		container.delete()

		if (nextNode) {
			core.selection.setSelection(nextNode.element, 0)
		}
	}

	enterHandler(event, core) {
		event.preventDefault()

		if (!this.parent.isSection) {
			return false
		}

		const container = core.selection.anchorContainer
		const paragraph = new Paragraph()

		if (event.shiftKey) {
			container.preconnect(paragraph)
		} else {
			container.connect(paragraph)
		}

		core.selection.setSelection(paragraph.element, 0)
	}

	addResizeEventListener(listener) {
		if (!listeners.length) {
			listeners.push(listener)
			document.body.addEventListener('keydown', windowResizeHandler)
			window.addEventListener('resize', windowResizeHandler)
		}
	}

	removeResizeEventListener(listener) {
		if (listeners.length === 1) {
			window.removeEventListener('resize', windowResizeHandler)
			document.body.removeEventListener('keydown', windowResizeHandler)
			listeners.splice(listeners.indexOf(listener), 1)
		}
	}
}
