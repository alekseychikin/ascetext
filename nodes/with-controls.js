import Node from './node.js'

export default class WithControls extends Node {
	constructor(type, attributes = {}) {
		super(type, attributes)
	}

	onFocus() {
		this.element.setAttribute('data-focus', '')
	}

	onBlur() {
		this.element.removeAttribute('data-focus')
	}
}
