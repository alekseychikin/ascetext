export default class ControlControl {
	constructor(params) {
		this.params = params

		this.element = document.createElement('button')
		this.element.appendChild(document.createTextNode('Button'))
	}

	setEventListener(handler) {
		this.handler = handler
	}

	getElement() {
		return this.element
	}
}
