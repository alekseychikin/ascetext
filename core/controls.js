export default class Controls {
	constructor(core) {
		this.core = core

		this.controls = []
	}

	registerControl(control) {
		this.controls.push(control)

		if (this.core.node.nextSibling) {
			this.core.node.parentNode.insertBefore(control, this.core.node.nextSibling)
		} else {
			this.core.node.parentNode.appendChild(control)
		}
	}

	unregisterControl(control) {
		control.parentNode.removeChild(control)
		this.controls.splice(this.controls.indexOf(control), 1)
	}

	destroy() {
		this.controls.forEach((item) =>
			item.parentNode.removeChild(item)
		)
		this.controls.splice(0, this.controls.length)
	}
}
