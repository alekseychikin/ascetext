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

export function getIcon(iconSource) {
	if (iconSource.toLowerCase().indexOf('<svg') !== -1) {
		const container = document.createElement('div')

		container.innerHTML = iconSource

		return container.firstChild
	}

	const img = document.createElement('img')

	img.src = iconSource

	return img
}
