const Node = require('./node')

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

class WithControls extends Node {
	constructor(type) {
		super(type)

		this.controlHandler = this.controlHandler.bind(this)
		this.setPosition = this.setPosition.bind(this)
		this.onMouseDown = this.onMouseDown.bind(this)

		this.controls = []
	}

	onMouseDown() {
		this.selection.focusedControl = true
	}

	setPosition() {
		const scrollTop = document.body.scrollTop || document.documentElement.scrollTop
		const containerBoundingClientRect = this.element.getBoundingClientRect()
		const left =
			containerBoundingClientRect.left + (this.element.offsetWidth / 2) - (this.controlsElement.offsetWidth / 2)

		this.controlsElement.style.top = containerBoundingClientRect.top + scrollTop + 'px'
		this.controlsElement.style.left = left + 'px'
	}

	controlHandler(action, event) {
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
			this.controlsElement.addEventListener('mousedown', this.onMouseDown)
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

	addResizeEventListener(listener) {
		if (!listeners.length) {
			document.body.addEventListener('keydown', windowResizeHandler)
			window.addEventListener('resize', windowResizeHandler)
		}

		listeners.push(listener)
	}

	removeResizeEventListener(listener) {
		listeners.splice(listeners.indexOf(listener), 1)

		if (!listeners.length) {
			window.removeEventListener('resize', windowResizeHandler)
			document.body.removeEventListener('keydown', windowResizeHandler)
		}
	}
}

module.exports = WithControls
