import isFunction from '../utils/is-function.js'

export default class SizeObserver {
	constructor(core, middleware) {
		this.core = core

		this.update = this.update.bind(this)
		this.updateHandler = this.updateHandler.bind(this)

		this.id = 0
		this.ids = []
		this.observedElements = []
		this.handlers = []
		this.timer = null
		this.middleware = middleware

		this.core.selection.onUpdate(this.update)
		window.addEventListener('resize', this.update)
	}

	observe(element, handler) {
		const id = ++this.id

		this.ids.push(id)
		this.observedElements.push(element)
		this.handlers.push(handler)
		this.update()

		return () => {
			const index = this.ids.indexOf(id)

			this.ids.splice(index, 1)
			this.observedElements.splice(index, 1)
			this.handlers.splice(index, 1)
		}
	}

	update() {
		if (this.timer) {
			return null
		}

		this.timer = requestAnimationFrame(this.updateHandler)
	}

	updateHandler() {
		this.observedElements.forEach((element, index) => {
			let boundings = this.calculateBoundings(element)

			if (isFunction(this.middleware)) {
				boundings = this.middleware(boundings)
			}

			this.handlers[index](boundings)
		})
		this.timer = null
	}

	calculateBoundings(element) {
		return {
			scrollTop: document.body.scrollTop || document.documentElement.scrollTop || 0,
			scrollLeft: document.body.scrollLeft || document.documentElement.scrollLeft || 0,
			element: element.getBoundingClientRect(),
			root: this.core.node.getBoundingClientRect()
		}
	}

	destroy() {
		window.removeEventListener('resize', this.update)
	}
}
