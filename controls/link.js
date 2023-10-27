import ControlControl from './control.js'

export default class ControlLink extends ControlControl {
	createElement() {
		this.element = document.createElement('a')
		this.element.title = this.params.label
		this.element.href = this.params.url
		this.element.target = '_blank'
		this.element.className = 'contenteditor__control'
		this.element.appendChild(document.createTextNode(this.params.url))
	}
}
