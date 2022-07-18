const ControlControl = require('./control')

class ControlLink extends ControlControl {
	constructor(params) {
		super(params)

		this.element = document.createElement('a')
		this.element.title = params.label
		this.element.href = params.url
		this.element.target = '_blank'
		this.element.className = 'contenteditor__control'
		this.element.appendChild(document.createTextNode(params.url))
	}
}

module.exports = ControlLink
