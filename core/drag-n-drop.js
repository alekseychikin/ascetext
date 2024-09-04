export default class Dragndrop {
	constructor(core) {
		this.core = core
		this.node = core.node

		this.dropHandler = this.dropHandler.bind(this)
		this.pointerMoveHandler = this.pointerMoveHandler.bind(this)
		this.pointerUpHandler = this.pointerUpHandler.bind(this)

		this.node.addEventListener('dragstart', this.dragStartHandler)
		this.node.addEventListener('dragover', this.dragOverHandler)
		this.node.addEventListener('drop', this.dropHandler)
		document.addEventListener('pointermove', this.pointerMoveHandler)
		document.addEventListener('pointerup', this.pointerUpHandler)

		this.pointerdownTimer = null
		this.isPointerDown = false
		this.dragging = null
		this.startClientX = 0
		this.startClientY = 0
		this.initOffsetLeft = 0
		this.initOffsetTop = 0

		document.addEventListener('pointerdown', (event) => {
			this.isPointerDown = true
			this.pointerdownTimer = setTimeout(() => {
				if (this.isPointerDown && event.target) {
					event.target.dispatchEvent(new CustomEvent('pointerlongdown', {
						detail: {
							clientX: event.clientX,
							clientY: event.clientY,
							pageX: event.pageX,
							pageY: event.pageY,
							screenX: event.screenX,
							screenY: event.screenY
						}
					}))
				}
			}, 1000)
		})
		document.addEventListener('pointerup', () => {
			this.isPointerDown = false
		})
		this.timer = null
	}

	handleDragging(container, event) {
		this.dragging = container
		this.startClientX = event.detail.clientX
		this.startClientY = event.detail.clientY
		this.initOffsetLeft = container.element.offsetLeft
		this.initOffsetTop = container.element.offsetTop
		this.dragging.element.style.position = 'absolute'
	}

	pointerMoveHandler(event) {
		if (this.dragging) {
			const shiftX = event.clientX - this.startClientX
			const shiftY = event.clientY - this.startClientY

			this.dragging.element.style.transform = `translate(${shiftX}px, ${shiftY}px)`
		}
	}

	pointerUpHandler() {
		if (this.dragging) {
			this.dragging.element.style.transform = ''
			this.dragging.element.style.position = ''
		}

		this.dragging = null
	}

	dragStartHandler(event) {
		event.preventDefault()
	}

	dragOverHandler(event) {
		// Это событие подойдёт для визуального отображения
		console.log(event.target)
	}

	async dropHandler(event) {
		let range
		let textNode
		let offset

		event.preventDefault()

		const current = await this.core.builder.parseFiles(this.getFiles(event.dataTransfer))

		if (current) {
			if (document.caretPositionFromPoint) {
				range = document.caretPositionFromPoint(event.clientX, event.clientY)
				textNode = range.offsetNode
				offset = range.offset
			} else if (document.caretRangeFromPoint) {
				range = document.caretRangeFromPoint(event.clientX, event.clientY)
				textNode = range.startContainer
				offset = range.startOffset
			} else {
				return
			}

			this.core.selection.selectionUpdate({
				type: 'selectionchange',
				anchorNode: textNode,
				focusNode: textNode,
				anchorOffset: offset,
				focusOffset: offset,
				isCollapsed: true,
				selectedComponent: false
			})
			this.core.builder.insert(current)
			this.core.selection.setSelection(current)
		}
	}

	getFiles(dataTransfer) {
		if (dataTransfer.items) {
			return [...dataTransfer.items]
				.filter((item) => item.kind === 'file')
				.map((item) => item.getAsFile())
		}

		return [...dataTransfer.files]
	}

	destroy() {
		this.node.removeEventListener('dragstart', this.dragStartHandler)
		this.node.removeEventListener('dragover', this.dragOverHandler)
		this.node.removeEventListener('drop', this.dragStartHandler)
	}
}
