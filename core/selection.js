import { getNodeByElement } from '../utils/map-element-to-node'
import getStyle from '../utils/getStyle'
import isElementBr from '../utils/is-element-br'
import isTextElement from '../utils/is-text-element'
import createElement from '../utils/create-element'

export default class Selection {
	constructor(core) {
		this.onFocus = this.onFocus.bind(this)
		this.update = this.update.bind(this)
		this.onUpdate = this.onUpdate.bind(this)
		this.setSelection = this.setSelection.bind(this)
		this.restoreSelection = this.restoreSelection.bind(this)
		this.eventHandler = this.eventHandler.bind(this)

		this.core = core
		this.selection = {}
		this.anchorIndex = null
		this.focusIndex = null
		this.focused = false
		this.skipUpdate = false
		this.forceUpdate = false
		this.onUpdateHandlers = []
		this.selectedItems = []
		this.focusedNodes = []

		document.addEventListener('focus', this.onFocus, true)
		document.addEventListener('click', this.eventHandler)
		document.addEventListener('keyup', this.eventHandler)
		document.addEventListener('keydown', this.eventHandler)
		document.addEventListener('input', this.eventHandler)
	}

	eventHandler(event) {
		setTimeout(() => this.update(event), 0)
	}

	onFocus(event) {
		if (this.core.node.contains(event.target) && this.core.node !== event.target) {
			const anchorNode = getNodeByElement(event.target)

			if (anchorNode && anchorNode.isWidget) {
				this.setSelection(anchorNode)
			}
		}
	}

	update() {
		const selection = document.getSelection()
		const { anchorNode: anchorElement, focusNode: focusElement, isCollapsed } = selection

		if (this.skipUpdate) {
			console.log('skip')

			return false
		}

		if (!this.core.node.contains(anchorElement) || !this.core.node.contains(focusElement)) {
			if (this.focused) {
				console.log('blur')
				this.blur()
			}

			return false
		}

		const firstNode = getNodeByElement(anchorElement)
		const lastNode = getNodeByElement(focusElement)
		const firstContainer = firstNode.getClosestContainer()
		const lastContainer = lastNode.getClosestContainer()
		const firstIndex = this.getIndex(firstContainer, anchorElement, selection.anchorOffset)
		const lastIndex = this.getIndex(lastContainer, focusElement, selection.focusOffset)
		const isForwardDirection = this.getDirection(firstIndex, lastIndex) === 'forward'
		const [ anchorContainer, focusContainer ] =
			isForwardDirection ? [ firstContainer, lastContainer ] : [ lastContainer, firstContainer ]
		const [ anchorNode, focusNode ]=
			isForwardDirection ? [ firstNode, lastNode ] : [ lastNode, firstNode ]
		const anchorContainerLength = anchorContainer.isContainer ? anchorContainer.getOffset() : 0
		const focusContainerLength = focusContainer.isContainer ? focusContainer.getOffset() : 0
		const [ anchorSelectedElement, anchorSelectedOffset ] = isForwardDirection
			? this.getSelectedElement(anchorElement, selection.anchorOffset)
			: this.getSelectedElement(focusElement, selection.focusOffset)
		const [ focusSelectedElement, focusSelectedOffset ] = isForwardDirection
			? this.getSelectedElement(focusElement, selection.focusOffset)
			: this.getSelectedElement(anchorElement, selection.anchorOffset)
		const anchorOffset = anchorSelectedOffset + anchorContainer.getOffset(anchorSelectedElement)
		// console.log(anchorOffset)
		const focusOffset = focusSelectedOffset + focusContainer.getOffset(focusSelectedElement)

		this.anchorIndex = isForwardDirection ? firstIndex : lastIndex
		this.focusIndex = isForwardDirection ? lastIndex : firstIndex
		this.focused = true
		this.isRange = !isCollapsed
		this.anchorAtFirstPositionInContainer = anchorOffset === 0
		this.anchorAtLastPositionInContainer = anchorOffset === anchorContainerLength
		this.focusAtFirstPositionInContainer = focusOffset === 0
		this.focusAtLastPositionInContainer = focusOffset === focusContainerLength

		if (
			!this.forceUpdate &&
			this.anchorContainer === anchorContainer &&
			this.focusContainer === focusContainer &&
			this.anchorOffset === anchorOffset &&
			this.focusOffset === focusOffset
		) {
			this.handleSelectedItems(anchorNode, focusNode)
			this.onUpdateHandlers.forEach((handler) => handler(this))

			return false
		}

		this.forceUpdate = false
		this.anchorContainer = anchorContainer
		this.focusContainer = focusContainer
		this.anchorOffset = anchorOffset
		this.focusOffset = focusOffset

		this.handleSelectedItems(anchorNode, focusNode)
		this.onUpdateHandlers.forEach((handler) => handler(this))
	}

	blur() {
		this.focused = false

		if (this.anchorContainer) {
			this.core.editing.update(this.anchorContainer)
		}

		this.anchorContainer = null
		this.focusContainer = null
		this.anchorOffset = null
		this.focusOffset = null

		this.onUpdateHandlers.forEach((handler) => handler(this))
	}

	onUpdate(handler) {
		this.onUpdateHandlers.push(handler)
	}

	setSelection(anchorNode, anchorOffset, focusNode, focusOffset) {
		const sel = window.getSelection()
		const { element: anchorElement, index: anchorIndex } = this.getSelectionParams(
			anchorNode,
			typeof anchorOffset === 'undefined' ? 0 : anchorOffset < 0 ?
				anchorNode.getOffset() + anchorOffset + 1 : anchorOffset
		)

		if (focusNode) {
			const { element: focusElement, index: focusIndex } =
				this.getSelectionParams(focusNode, focusOffset)

			if (anchorElement === focusElement && anchorIndex === focusIndex) {
				if (anchorNode.isWidget) {
					anchorNode.element.focus()
				} else {
					sel.collapse(anchorElement, anchorIndex)
				}
			} else {
				sel.setBaseAndExtent(anchorElement, anchorIndex, focusElement, focusIndex)
			}
		} else {
			sel.collapse(anchorElement, anchorIndex)
		}

		this.update()
	}

	getSelectionParams(node, offset) {
		const { element: childByOffset } = node.getChildByOffset(offset)
		let element = node.element
		let index = offset

		if (node.isWidget && offset === 0) {
			return { element: node.element, index: 0 }
		} else if (isTextElement(childByOffset)) {
			element = childByOffset
			index -= node.getOffset(childByOffset)
		} else {
			const parentNode = childByOffset.parentNode
			let i

			for (i = 0; i < parentNode.childNodes.length; i++) {
				if (parentNode.childNodes[i] === childByOffset) {
					element = parentNode
					index = i

					break
				}
			}
		}

		return { element, index }
	}

	// TODO: forceUpdate выглядит как костыль. Хочется чтобы восстановление выделения было без него
	restoreSelection(forceUpdate = true) {
		this.forceUpdate = forceUpdate
		this.setSelectionByIndexes(this.getSelectionInIndexes())
	}

	getSelectionInIndexes() {
		return {
			anchorIndex: this.anchorIndex,
			focusIndex: this.focusIndex
		}
	}

	setSelectionByIndexes(indexes) {
		const anchorElement = this.findElement(indexes.anchorIndex.slice(0, -1))
		const focusElement = this.findElement(indexes.focusIndex.slice(0, -1))
		const anchorNode = getNodeByElement(anchorElement)
		const focusNode = getNodeByElement(focusElement)

		this.setSelection(
			anchorNode,
			indexes.anchorIndex[indexes.anchorIndex.length - 1],
			focusNode,
			indexes.focusIndex[indexes.focusIndex.length - 1]
		)
	}

	getSelectedElement(element, offset) {
		if (isTextElement(element) || isElementBr(element)) {
			return [ element, offset ]
		}

		return [ element.childNodes[offset], 0 ]
	}

	getDirection(anchorIndex, focusIndex) {
		let i = 0

		for (; i < anchorIndex.length; i++) {
			if (focusIndex[i] < anchorIndex[i]) {
				return 'backward'
			} else if (focusIndex[i] > anchorIndex[i]) {
				return 'forward'
			}
		}

		return 'forward'
	}

	getIndex(container, element, offset) {
		const indexes = []
		let index
		let current = container.element

		while (current !== this.core.model.element) {
			index = 0

			while (true) { // eslint-disable-line no-constant-condition
				if (!current.previousSibling) {
					break
				}

				index++
				current = current.previousSibling
			}

			indexes.unshift(index)
			current = current.parentNode
		}

		if (container.element === element) {
			element = container.element.childNodes[offset]
			indexes.push(container.getOffset(element))
		} else {
			indexes.push(container.getOffset(element) + (isTextElement(element) ? offset : 0))
		}

		return indexes
	}

	findElement(indexes) {
		let current = this.core.model.element
		let i

		for (i = 0; i < indexes.length; i++) {
			current = current.childNodes[indexes[i]]
		}

		return current
	}

	getSelectedItems() {
		const { head, tail } = this.cutRange()

		return this.getArrayRangeItems(head, tail)
	}

	cutRange(
		anchorContainer = this.anchorContainer,
		anchorOffset = this.anchorOffset,
		focusContainer = this.focusContainer,
		focusOffset = this.focusOffset
	) {
		// debugger
		const focus = this.core.builder.split(focusContainer, focusOffset)
		const anchor = this.core.builder.split(anchorContainer, anchorOffset)
		const anchorNextContainer = anchorContainer.getNextSelectableNode()
		const focusPreviousContainer = focusContainer.getPreviousSelectableNode()

		return {
			head: !anchor.head && !focus.head
				? anchorContainer
				: !anchor.tail
					? anchorNextContainer
					: anchor.tail,
			tail: !focus.head && !anchor.head
				? focusPreviousContainer.last || focusPreviousContainer
				: !focus.head
					? focusContainer
					: !focus.head.element.parentNode || focus.head === anchor.head
						? anchor.tail.deepesetLastNode()
						: focus.head.deepesetLastNode()
		}
	}

	getArrayRangeItems(since, until) {
		let current = since
		const selectedItems = []

		while (current) {
			selectedItems.push(current)

			if (current === until) {
				break
			}

			if (current.first && !current.isWidget) {
				current = current.first

				continue
			}

			if (current.next) {
				current = current.next

				continue
			}

			if (current.parent) {
				current = current.parent

				if (current === until) {
					break
				}

				while (current) {
					if (current.isContainer) {
						current = current.getNextSelectableNode()

						break
					}

					if (current.next) {
						current = current.next

						break
					}

					current = current.parent
				}
			}
		}

		return selectedItems
	}

	handleSelectedItems(anchorNode, focusNode) {
		const selectedItems = this.getArrayRangeItems(anchorNode, focusNode)
		const focusedNodes = selectedItems.slice(0)
		let firstNode = focusedNodes[0]

		selectedItems.forEach((item) => {
			if (item.isWidget && this.selectedItems.indexOf(item) === -1) {
				item.onFocus(this)
			}
		})
		this.selectedItems.forEach((item) => {
			if (item.isWidget && selectedItems.indexOf(item) === -1) {
				item.onBlur(this)
			}
		})

		while (firstNode && firstNode !== this.anchorContainer.parent) {
			focusedNodes.unshift(firstNode)
			firstNode = firstNode.parent
		}

		this.selectedItems = selectedItems
		this.focusedNodes = focusedNodes.filter((node, index, self) => self.indexOf(node) === index)
	}

	destroy() {
		document.removeEventListener('focus', this.onFocus, true)
		document.removeEventListener('click', this.onClickHandler)
		document.removeEventListener('keyup', this.update)
		document.removeEventListener('input', this.update)
	}
}
