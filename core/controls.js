export default class Controls {
	constructor(core) {
		this.core = core

		this.container = document.createElement('div')
		this.controls = []

		if (this.core.node.nextSibling) {
			this.core.node.parentNode.insertBefore(this.container, this.core.node.nextSibling)
		} else {
			this.core.node.parentNode.appendChild(this.container)
		}
	}

	registerControl(control) {
		this.controls.push(control)
		this.container.appendChild(control)
	}

	unregisterControl(control) {
		control.parentNode.removeChild(control)
		this.controls.splice(this.controls.indexOf(control), 1)
	}

	destroy() {
		this.container.parentNode.removeChild(this.container)
		this.controls.splice(0, this.controls.length)
	}
}
