import ControlControl from './control'
import getIcon from '../utils/get-icon'

export default class ControlButton extends ControlControl {
	handleAction(event) {
		this.handler(this.params.action, event)
	}

	constructor(params) {
		super(params)

		this.handleAction = this.handleAction.bind(this)
		this.element = document.createElement('button')
		this.element.addEventListener('click', this.handleAction)
		this.element.title = params.label

		if (params.icon) {
			this.element.appendChild(getIcon(params.icon))
		} else {
			this.element.appendChild(document.createTextNode(params.label))
		}
	}

	setEventListener(handler) {
		this.handler = handler
	}

	getElement(node) {
		const classNames = [
			'contenteditor__control'
		]

		if (this.params.selected && (typeof this.params.selected === 'function' && this.params.selected(node) || this.params.selected === true)) {
			classNames.push('contenteditor__control--selected')
		}

		if (this.params.disabled && (typeof this.params.disabled === 'function' && this.params.disabled(node) || this.params.disabled === true)) {
			classNames.push('contenteditor__control--disabled')
		}

		this.element.className = classNames.join(' ')

		return this.element
	}
}
