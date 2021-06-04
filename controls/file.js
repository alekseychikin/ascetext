const ControlControl = require('./control')
const getIcon = ControlControl.getIcon

class ControlFile extends ControlControl {
	handleAction(event) {
		this.handler(this.params.action, event)
	}

	constructor(params) {
		super(params)

		this.handleAction = this.handleAction.bind(this)
		this.element = document.createElement('label')
		this.input = document.createElement('input')
		this.input.addEventListener('change', this.handleAction)
		this.element.title = params.label

		this.input.type = 'file'
		this.input.className = 'rich-editor__control-input-file'
		this.element.appendChild(this.input)

		if (params.icon) {
			this.element.appendChild(getIcon(params.icon))
		} else {
			this.element.appendChild(document.createTextNode(params.label))
		}
	}

	getElement() {
		const classNames = [
			'rich-editor__control'
		]

		if (this.params.selected && (typeof this.params.selected === 'function' && this.params.selected(this.node) || this.params.selected === true)) {
			classNames.push('rich-editor__control--selected')
		}

		if (this.params.disabled && (typeof this.params.disabled === 'function' && this.params.disabled(this.node) || this.params.disabled === true)) {
			classNames.push('rich-editor__control--disabled')
		}

		this.element.className = classNames.join(' ')

		return this.element
	}
}

module.exports = ControlFile
