import ControlControl from './control'

export default class ControlInput extends ControlControl {
	handleAction = (event) => {
		this.handlers.action(this.params.action, event)
	}

	handleCancel = (event) => {
		if (this.handlers.cancel) {
			this.handlers.cancel(this.params.cancel, event)
		}
	}

	handleKeydown = (event) => {
		if (event.keyCode === 13) {
			event.preventDefault()
			this.handleAction(event)
		} else if (event.keyCode === 27) {
			event.preventDefault()
			this.handleCancel(event)
		}
	}

	constructor(params) {
		super(params)

		this.handlers = {}
		this.element = document.createElement('input')
		this.element.addEventListener('keydown', this.handleKeydown)
		this.element.placeholder = params.placeholder
		this.element.className = 'rich-editor__control-input'
	}

	setEventListener(handler, field) {
		this.handlers[field] = handler
	}

	getElement() {
		setTimeout(() => this.element.focus(), 0)

		return this.element
	}
}
