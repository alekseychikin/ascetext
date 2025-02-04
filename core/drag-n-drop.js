import Publisher from './publisher.js'
import findParent from '../utils/find-parent.js'
import isHtmlElement from '../utils/is-html-element.js'
import debounce from '../utils/debounce.js'

export default class Dragndrop extends Publisher {
	constructor(core) {
		super()

		this.core = core
		this.node = core.node

		this.getScrollTop = this.core.params.getScrollTop.bind(this)
		this.updateDraggingPosition = debounce(this.updateDraggingPosition.bind(this), 10)
		this.dropHandler = this.dropHandler.bind(this)
		this.pointerMoveHandler = this.pointerMoveHandler.bind(this)
		this.pointerUpHandler = this.pointerUpHandler.bind(this)
		this.setTargetAndAnchor = this.setTargetAndAnchor.bind(this)
		this.keydownHandler = this.keydownHandler.bind(this)

		this.node.addEventListener('dragstart', this.dragStartHandler)
		this.node.addEventListener('dragover', this.dragOverHandler)
		this.node.addEventListener('drop', this.dropHandler)
		document.addEventListener('pointermove', this.pointerMoveHandler)
		document.addEventListener('pointerup', this.pointerUpHandler)
		document.addEventListener('scroll', this.updateDraggingPosition)

		this.pointerdownTimer = null
		this.isPointerDown = false
		this.dragging = null
		this.initDraggingShiftX = 0
		this.initDraggingShiftY = 0
		this.startClientX = 0
		this.startClientY = 0
		this.target = null
		this.anchor = null

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
			}, 300)
		})
		document.addEventListener('pointerup', () => {
			this.isPointerDown = false
		})
		this.timer = null
	}

	handleDragging(container, event) {
		this.target = findParent(container, (node) => node.isSection)
		this.dragging = findParent(container, (node) => (node.isWidget || node.isContainer) && node.parent === this.target)

		const boundings = this.dragging.element.getBoundingClientRect()

		this.core.timeTravel.preservePreviousSelection()
		this.anchor = this.findAnchor(event.detail)
		this.startClientX = event.detail.clientX
		this.startClientY = event.detail.clientY
		this.startScrollTop = this.getScrollTop()
		this.clientX = event.detail.clientX
		this.clientY = event.detail.clientY
		this.shiftX = 0
		this.shiftY = 0
		this.initDraggingShiftX = boundings.left - event.detail.clientX
		this.initDraggingShiftY = boundings.top - event.detail.clientY
		this.dragging.element.style.top = `${this.dragging.element.offsetTop}px`
		this.dragging.element.style.left = `${this.dragging.element.offsetLeft}px`
		this.dragging.element.style.position = 'absolute'
		this.dragging.element.style.pointerEvents = 'none'
		this.setTargetAndAnchor(event.detail)
		document.addEventListener('keydown', this.keydownHandler)
	}

	pointerMoveHandler(event) {
		if (this.dragging) {
			this.clientX = event.clientX
			this.clientY = event.clientY
			this.shiftX = event.clientX - this.startClientX
			this.shiftY = event.clientY - this.startClientY
			this.updateDraggingPosition()
		}
	}

	updateDraggingPosition() {
		if (this.dragging) {
			const shiftScrollTop = this.getScrollTop() - this.startScrollTop

			this.dragging.element.style.transform = `translate(${this.shiftX}px, ${this.shiftY + shiftScrollTop}px)`
			this.setTargetAndAnchor()
			this.sendMessage({
				type: 'dragging',
				shiftX: this.shiftX,
				shiftY: this.shiftY,
				shiftScrollTop
			})
		}
	}

	setTargetAndAnchor() {
		const elementFromPoint = this.getElementFromPoint()
		const targetElement = elementFromPoint.closest('[data-node-id]')
		const targetNode = targetElement ? this.core.render.getNodeById(targetElement.dataset.nodeId) : this.core.model

		if (targetNode) {
			const target = findParent(targetNode, (node) => node.isSection)
			const anchor = this.findAnchor()

			if (this.target) {
				this.sendMessage({
					type: 'dragout',
					target: this.target,
					anchor: this.anchor,
					dragging: this.dragging
				})
			}

			this.target = target
			this.anchor = anchor
			this.sendMessage({
				type: 'dragover',
				target: this.target,
				anchor: this.anchor,
				dragging: this.dragging
			})
		}
	}

	getElementFromPoint() {
		const targetElement = document.elementFromPoint(this.clientX + this.initDraggingShiftX, this.clientY + this.initDraggingShiftY)

		if (isHtmlElement(targetElement)) {
			return targetElement
		}

		return targetElement.parentNode
	}

	findAnchor() {
		const ceilClientY = Math.ceil(this.clientY) + this.initDraggingShiftY
		const floorClientY = Math.floor(this.clientY)
		let left = 0
		let right = this.target.childrenAmount - (this.dragging.parent === this.target ? 2 : 1)
		let bestChoice = null

		while (left <= right) {
			const middle = Math.floor((left + right) / 2)
			const node = this.getChild(middle)
			const boundings = node.element.getBoundingClientRect()

			if (
				boundings.top <= ceilClientY &&
				boundings.bottom >= floorClientY
			) {
				return node
			}

			if (boundings.top > ceilClientY) {
				right = middle - 1
				bestChoice = node
			} else {
				left = middle + 1
			}
		}

		return bestChoice
	}

	getChild(index) {
		let current = this.target.first
		let i = 0

		if (current.id === this.dragging.id) {
			current = current.next
		}

		while (i++ < index) {
			current = current.next

			if (current.id === this.dragging.id) {
				current = current.next
			}
		}

		return current
	}

	pointerUpHandler() {
		if (this.target) {
			this.core.builder.push(this.target, this.dragging, this.anchor)
			this.core.builder.commit()
			this.core.selection.setSelection(this.dragging, 0)
		}

		this.cancel()
	}

	cancel() {
		if (this.dragging) {
			if (this.target) {
				this.sendMessage({
					type: 'dragout',
					target: this.target,
					anchor: this.anchor,
					dragging: this.dragging
				})
			}

			this.dragging.element.style.top = ''
			this.dragging.element.style.left = ''
			this.dragging.element.style.transform = ''
			this.dragging.element.style.position = ''
			this.dragging.element.style.pointerEvents = ''
			this.target = null
			this.anchor = null
			this.dragging = null
			this.targetElement = null
			this.sendMessage({
				type: 'drop'
			})
			document.removeEventListener('keydown', this.keydownHandler)
		}
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

		this.sendMessage({
			type: 'drop'
		})
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

	keydownHandler(event) {
		if (event.key === 'Escape') {
			this.cancel()
		}
	}

	destroy() {
		this.node.removeEventListener('dragstart', this.dragStartHandler)
		this.node.removeEventListener('dragover', this.dragOverHandler)
		this.node.removeEventListener('drop', this.dragStartHandler)
		document.removeEventListener('pointermove', this.pointerMoveHandler)
		document.removeEventListener('pointerup', this.pointerUpHandler)
		document.removeEventListener('scroll', this.updateDraggingPosition)
	}
}
