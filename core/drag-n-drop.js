import findParent from '../utils/find-parent.js'
import isHtmlElement from '../utils/is-html-element.js'

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
		this.targetElement = null
		this.targetBoundings = null

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
		const section = findParent(container, (node) => node.isSection)
		const dragging = findParent(container, (node) => (node.isWidget || node.isContainer) && node.parent === section)

		console.log(section, dragging)

		this.dragging = dragging
		this.startClientX = event.detail.clientX
		this.startClientY = event.detail.clientY
		this.initOffsetLeft = dragging.element.offsetLeft
		this.initOffsetTop = dragging.element.offsetTop
		this.dragging.element.style.position = 'absolute'
	}

	pointerMoveHandler(event) {
		if (this.dragging) {
			const shiftX = event.clientX - this.startClientX
			const shiftY = event.clientY - this.startClientY
			const targetElement = this.core.selection.getContainerAndOffset(document.elementFromPoint(event.clientX, event.clientY), 0).container

			this.dragging.element.style.transform = `translate(${shiftX}px, ${shiftY}px)`

			if (this.targetElement !== targetElement) {
				if (this.targetElement) {
					this.targetElement.classList.remove('target')
					this.targetElement.parentNode.classList.remove('section')
				}

				if (isHtmlElement(targetElement)) {
					this.targetElement = targetElement
					this.targetElement.classList.add('target')
					this.targetElement.parentNode.classList.add('section')
					this.targetBoundings = targetElement.getBoundingClientRect()
				}
			}

			console.log(event.screenY, this.targetBoundings.top, event.clientX, this.targetBoundings.left)
		}
	}

	pointerUpHandler() {
		if (this.dragging) {
			this.dragging.element.style.transform = ''
			this.dragging.element.style.position = ''

			if (this.targetElement) {
				this.targetElement.classList.remove('target')
			}
		}

		this.dragging = null
		this.targetElement = null
		this.targetBoundings = null
	}

	dragStartHandler(event) {
		event.preventDefault()
	}

	dragOverHandler(event) {
		// Это событие подойдёт для визуального отображения
		// console.log(event.target)
	}

	async dropHandler(event) {
		let caretPosition

		event.preventDefault()

		const current = await this.core.builder.parseFiles(this.getFiles(event.dataTransfer))

		if (current && (caretPosition = this.getElementAndCaretPositionFromPoint(event))) {
			const { textNode, offset } = caretPosition

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

	getElementAndCaretPositionFromPoint(event) {
		if (document.caretPositionFromPoint) {
			const range = document.caretPositionFromPoint(event.clientX, event.clientY)

			return {
				textNode: range.offsetNode,
				offset: range.offset
			}
		}

		if (document.caretRangeFromPoint) {
			const range = document.caretRangeFromPoint(event.clientX, event.clientY)

			return {
				textNode: range.startContainer,
				offset: range.startOffset
			}
		}

		return null
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
