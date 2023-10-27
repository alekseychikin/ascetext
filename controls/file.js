import ControlControl from './control.js'
import getIcon from '../utils/get-icon.js'
import isFunction from '../utils/is-function.js'

export default class ControlFile extends ControlControl {
	handleAction(event) {
		this.handler(this.params.action, event)
	}

	constructor(params) {
		super(params)

		this.handleAction = this.handleAction.bind(this)
		this.input.addEventListener('change', this.handleAction)
	}

	createElement() {
		this.element = document.createElement('label')
		this.input = document.createElement('input')
		this.element.title = this.params.label

		this.input.type = 'file'
		this.input.className = 'contenteditor__control-input-file'
		this.element.appendChild(this.input)

		if (this.params.icon && this.params.showIcon) {
			this.element.appendChild(getIcon(this.params.icon))
		}

		if (this.params.showLabel) {
			this.element.appendChild(document.createTextNode(this.params.label))
		}
	}

	getElement() {
		const classNames = [
			'contenteditor__control'
		]

		if (this.params.selected && (isFunction(this.params.selected) && this.params.selected(this.node) || this.params.selected === true)) {
			classNames.push('contenteditor__control--selected')
		}

		if (this.params.disabled && (isFunction(this.params.disabled) && this.params.disabled(this.node) || this.params.disabled === true)) {
			classNames.push('contenteditor__control--disabled')
		}

		this.element.className = classNames.join(' ')

		return this.element
	}
}
