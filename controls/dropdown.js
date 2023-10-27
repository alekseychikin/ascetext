import ControlControl from './control.js'
import getIcon from '../utils/get-icon.js'

export default class ControlDropdown extends ControlControl {
	get css() {
		return {
			container: 'contenteditor__control contenteditor__control--dropdown',
			openned: 'contenteditor__control--openned',
			selected: 'contenteditor__control--selected',
			disabled: 'contenteditor__control--disabled',
			dropdown: 'contenteditor__dropdown'
		}
	}

	constructor(params) {
		super(params)

		this.toggleDropdown = this.toggleDropdown.bind(this)
		this.element.addEventListener('click', this.toggleDropdown)
	}

	createElement() {
		this.element = document.createElement('button')
		this.element.title = this.params.label ?? 'Formatting'
		this.element.appendChild(document.createTextNode(this.params.label ?? 'Formatting'))
		this.element.appendChild(getIcon('<svg class="contenteditor__dropdown-arrow" xmlns="http://www.w3.org/2000/svg" width="13" height="7" fill="none"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 1 6.5 5.5 1 1"/></svg>'))
		this.element.className = this.css.container

		this.dropdown = document.createElement('div')
		this.dropdown.className = this.css.dropdown

		this.params.children.forEach((component) =>
			this.dropdown.appendChild(component.getElement())
		)
		this.element.appendChild(this.dropdown)
	}

	setEventListener(handler) {
		this.handler = handler

		this.params.children.forEach((component) =>
			component.setEventListener(handler)
		)
	}

	toggleDropdown(event) {
		event.preventDefault()

		this.handler(
			() => this.element.classList.toggle(this.css.openned),
			event,
			true,
		)
	}
}
