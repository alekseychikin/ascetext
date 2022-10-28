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

	onResize() {
		this.onScroll()
	}

	onScroll() {
		this.updateHandlers.forEach((handler) => handler())
	}
}
