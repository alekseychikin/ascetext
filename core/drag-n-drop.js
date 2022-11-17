export default class Dragndrop {
	constructor(core) {
		this.node = core.node
		this.selection = core.selection
		this.locked = false
		this.timer = null

		this.node.addEventListener('dragstart', this.dragStartHandler)
	}

	dragStartHandler(event) {
		event.preventDefault()
	}

	destroy() {
		this.node.removeEventListener('dragstart', this.dragStartHandler)
	}
}
