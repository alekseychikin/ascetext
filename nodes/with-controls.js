import Node from './node'

export default class WithControls extends Node {
	constructor(type) {
		super(type)

		this.controls = []
	}

	setPosition = () => {
		const scrollTop = document.body.scrollTop || document.documentElement.scrollTop
		const containerBoundingClientRect = this.element.getBoundingClientRect()
		const left =
			containerBoundingClientRect.left + (this.element.offsetWidth / 2) - (this.controlsElement.offsetWidth / 2)

		this.controlsElement.style.top = containerBoundingClientRect.top + scrollTop + 'px'
		this.controlsElement.style.left = left + 'px'
	}

	controlHandler = (action, event) => {
		action(event, this.selection)

		if (this.element) {
			this.renderControls(this.controls)
			this.element.focus({ preventScroll: true })
			this.setPosition()
			this.selection.setSelection(this.element, 0)
		}
	}

	renderControls(controls) {
		if (!controls.length) {
			this.removeControls()
			return
		}

		if (!this.controlsElement) {
			this.controlsElement = document.createElement('div')
			this.controlsElement.className = 'rich-editor__controls'
		}

		controls.forEach((control) => {
			control.setEventListener(this.controlHandler)
			this.controlsElement.appendChild(control.getElement(this))
		})

		document.body.appendChild(this.controlsElement)

		this.setPosition()
	}

	removeControls() {
		if (this.controlsElement) {
			this.controlsElement.parentNode.removeChild(this.controlsElement)
			this.controlsElement = null
		}
	}

	onFocus(selection) {
		this.selection = selection
		this.renderControls(this.controls)
	}

	onBlur() {
		this.removeControls()
	}

	onDelete() {
		this.removeControls()
	}
}
