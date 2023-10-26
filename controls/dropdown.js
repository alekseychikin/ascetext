import ControlControl from './control.js'

export default class ControlDropdown extends ControlControl {
	get css() {
		return {
			container: 'contenteditor__control contenteditor__control--dropdown',
			selected: 'contenteditor__control--selected',
			disabled: 'contenteditor__control--disabled',
			dropdown: 'contenteditor__dropdown',
			dropdownActive: 'contenteditor__dropdown--active'
		}
	}

	constructor(params) {
		super(params)

		this.components = params.components
		this.toggleDropdown = this.toggleDropdown.bind(this)
		this.element.addEventListener('click', this.toggleDropdown)
		this.element.title = this.params.label ?? 'Formatting'
		this.element.innerHTML = ''
		this.element.appendChild(document.createTextNode(this.params.label ?? 'Formatting'))
		this.element.className = this.css.container

		this.dropdown = document.createElement('div')
		this.dropdown.className = this.css.dropdown

		this.components.forEach((component) =>
			this.dropdown.appendChild(component.getElement())
		)
		this.element.appendChild(this.dropdown)
	}

	setEventListener(handler) {
		this.handler = handler

		this.components.forEach((component) =>
			component.setEventListener(handler)
		)
	}

	toggleDropdown(event) {
		event.preventDefault()

		this.handler(
			() => this.dropdown.classList.toggle(this.css.dropdownActive),
			event,
			true,
		)
	}
}
