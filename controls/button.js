import ControlControl from './control.js'
import getIcon from '../utils/get-icon.js'

export default class ControlButton extends ControlControl {
	get css() {
		return {
			container: 'contenteditor__control',
			selected: 'contenteditor__control--selected',
			disabled: 'contenteditor__control--disabled'
		}
	}

	handleAction(event) {
		this.handler(this.params.action, event)
	}

	constructor(params) {
		super(params)

		this.handleAction = this.handleAction.bind(this)
		this.element.addEventListener('click', this.handleAction)
	}

	createElement() {
		this.element = document.createElement('button')
		this.element.title = this.params.label

		if (this.params.icon && this.params.showIcon) {
			this.element.appendChild(getIcon(this.params.icon))
		}

		if (this.params.showLabel) {
			this.element.appendChild(document.createTextNode(this.params.label))
		}
	}

	getElement() {
		const classNames = [
			this.css.container
		]

		if (this.params.selected) {
			classNames.push(this.css.selected)
		}

		if (this.params.disabled) {
			classNames.push(this.css.disabled)
		}

		this.element.className = classNames.join(' ')

		return this.element
	}
}
