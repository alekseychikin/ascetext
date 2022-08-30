import createElement from '../utils/create-element'

export default class SuggestBar {
	constructor() {
		this.toolbar = createElement('div', {
			style: {
				position: 'absolute'
			}
		})

		document.body.appendChild(this.toolbar)
	}

	render(items, selection, boundings) {
		this.toolbar.innerHTML = ''

		items.forEach((item) => {
			this.toolbar.appendChild(createElement('button', {}, [
				document.createTextNode(item.label)
			]))
		})

		this.setPosition(boundings)
	}

	setPosition(boundings) {
		this.toolbar.style.top = (boundings.top + 20) + 'px'
		this.toolbar.style.left = boundings.left + 'px'
	}

	hide() {
		this.toolbar.innerHTML = ''
	}
}
