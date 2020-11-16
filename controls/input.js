const ControlControl = require('./control')

class ControlInput extends ControlControl {
	handleAction(event) {
		this.handlers.action(this.params.action, event)
	}

	handleCancel(event) {
		if (this.handlers.cancel) {
			this.handlers.cancel(this.params.cancel, event)
		}
	}

	handleKeydown(event) {
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

		this.handleAction = this.handleAction.bind(this)
		this.handleCancel = this.handleCancel.bind(this)
		this.handleKeydown = this.handleKeydown.bind(this)
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

module.exports = ControlInput
