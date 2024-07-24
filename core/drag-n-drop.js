export default class Dragndrop {
	constructor(core) {
		this.core = core
		this.node = core.node

		this.drop = this.drop.bind(this)

		this.node.addEventListener('dragstart', this.dragStartHandler)
		this.node.addEventListener('drop', this.dragStartHandler)
		document.addEventListener('drop', this.drop)
	}

	dragStartHandler(event) {
		event.preventDefault()
	}

	destroy() {
		this.node.removeEventListener('dragstart', this.dragStartHandler)
		this.node.removeEventListener('drop', this.dragStartHandler)
		document.removeEventListener('drop', this.drop)
	}

	drop() {
		setTimeout(() => {
			this.core.setContent(this.core.getContent())
			this.core.focus()
		}, 0)
	}
}
