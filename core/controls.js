export default class Controls {
	constructor(core) {
		this.core = core

		this.onResize = this.onResize.bind(this)
		this.onScroll = this.onScroll.bind(this)

		this.controls = []
		this.updateHandlers = []

		window.addEventListener('resize', this.onResize)
		window.addEventListener('scroll', this.onScroll)
	}

	registerControl(control, updatePosition, level = 'local') {
		this.controls.push(control)
		this.updateHandlers.push(updatePosition)

		switch (level) {
			case 'local':
				if (this.core.node.nextSibling) {
					this.core.node.parentNode.insertBefore(control, this.core.node.nextSibling)
				} else {
					this.core.node.parentNode.appendChild(control)
				}

				break
		}

		updatePosition()
	}

	unregisterControl(control) {
		const index = this.controls.indexOf(control)

		control.parentNode.removeChild(control)
		this.controls.splice(index, 1)
		this.updateHandlers.splice(index, 1)
	}

	onResize() {
		this.onScroll()
	}

	onScroll() {
		this.updateHandlers.forEach((handler) => handler())
	}
}
