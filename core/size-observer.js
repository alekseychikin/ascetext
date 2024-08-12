import isFunction from '../utils/is-function.js'

export default class SizeObserver {
	constructor(core, middleware) {
		this.core = core

		this.update = this.update.bind(this)
		this.updateHandler = this.updateHandler.bind(this)

		this.id = 0
		this.ids = []
		this.observedNodes = []
		this.handlers = []
		this.timer = null
		this.middleware = middleware

		this.core.selection.subscribe(this.update)
		this.core.builder.subscribe(this.update)
		this.core.render.subscribe(this.update)
		window.addEventListener('load', this.update)
		this.core.node.addEventListener('load', this.update, true)
		document.addEventListener('DOMContentLoaded', this.update)
		window.addEventListener('resize', this.update)
		visualViewport.addEventListener('resize', this.update)
		visualViewport.addEventListener('scroll', this.update)
	}

	observe(node, handler) {
		const id = ++this.id

		this.ids.push(id)
		this.observedNodes.push(node)
		this.handlers.push(handler)
		this.handleNode(this.observedNodes.length - 1)

		return () => {
			const index = this.ids.indexOf(id)

			this.ids.splice(index, 1)
			this.observedNodes.splice(index, 1)
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
		this.observedNodes.forEach((node, index) => {
			this.handleNode(index)
		})
		this.timer = null
	}

	handleNode(index) {
		const node = this.observedNodes[index]

		if (node.isMount) {
			let boundings = this.calculateBoundings(node.element)

			if (isFunction(this.middleware)) {
				boundings = this.middleware(boundings)
			}

			this.handlers[index](boundings)
		}
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
		window.removeEventListener('load', this.update)
		this.core.node.removeEventListener('load', this.update, true)
		document.removeEventListener('DOMContentLoaded', this.update)
		window.removeEventListener('resize', this.update)
		visualViewport.removeEventListener('resize', this.update)
		visualViewport.removeEventListener('scroll', this.update)
	}
}
