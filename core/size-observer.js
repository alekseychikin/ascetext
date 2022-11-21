export default class SizeObserver {
	constructor(core) {
		this.core = core

		this.update = this.update.bind(this)
		this.updateHandler = this.updateHandler.bind(this)

		this.observedElements = []
		this.handlers = []
		this.locked = false

		this.bindEvents()
	}

	bindEvents() {
		window.addEventListener('resize', this.update)
	}

	observe(element, handler) {
		this.observedElements.push(element)
		this.handlers.push(handler)
		this.update()

		return () => {
			const index = this.observedElements.indexOf(element)

			this.observedElements.splice(index, 1)
			this.handlers.splice(index, 1)
		}
	}

	update() {
		if (this.locked) {
			return null
		}

		this.locked = true
		requestAnimationFrame(this.updateHandler)
	}

	updateHandler() {
		this.observedElements.forEach((element, index) => {
			this.handlers[index](this.calculateBoundings(element))
		})
		this.locked = false
	}

	calculateBoundings(element) {
		return {
			offsetLeft: element.offsetLeft,
			offsetTop: element.offsetTop,
			offsetWidth: element.offsetWidth,
			offsetHeight: element.offsetHeight
		}
	}
}
