import { getNodeByElement } from '../utils/map-element-to-node.js'
import isElementBr from '../utils/is-element-br.js'
import isTextElement from '../utils/is-text-element.js'
import walk from '../utils/walk.js'
import isHtmlElement from '../utils/is-html-element.js'

export default class Selection {
	constructor(core) {
		this.update = this.update.bind(this)
		this.onUpdate = this.onUpdate.bind(this)
		this.setSelection = this.setSelection.bind(this)
		this.restoreSelection = this.restoreSelection.bind(this)

		this.core = core
		this.selection = {}
		this.anchorIndex = null
		this.focusIndex = null
		this.focused = false
		this.skipUpdate = false
		this.onUpdateHandlers = []
		this.selectedItems = []
		this.focusedNodes = []
		this.timer = null
		this.anchorAtFirstPositionInContainer = null
		this.anchorAtLastPositionInContainer = false
		this.focusAtFirstPositionInContainer = null
		this.focusAtLastPositionInContainer = false
		this.isRange = false
		this.anchorContainer = null
		this.focusContainer = null
		this.anchorOffset = 0
		this.focusOffset = 0

		document.addEventListener('click', this.update, true)
		document.addEventListener('keyup', this.update, true)
		document.addEventListener('input', this.update, true)
		document.addEventListener('selectionchange', this.update)
	}

	update(event) {
		if (event.type !== 'selectionchange') {
			if (this.core.node.contains(event.target)) {
				const anchorNode = getNodeByElement(event.target)

				if (anchorNode && anchorNode.isWidget) {
					anchorNode.element.focus()
					document.getSelection().collapse(anchorNode.element, 0)
				}
			} else {
				return this.blur()
			}
		}

		const {
			isCollapsed,
			anchorElement,
			focusElement,
			anchorOffset,
			focusOffset
		} = this.getPreparedSelection()

		if (!this.core.node.contains(anchorElement) || !this.core.node.contains(focusElement)) {
			return this.blur()
		}

		const firstNode = getNodeByElement(anchorElement)
		const lastNode = getNodeByElement(focusElement)
		const firstContainer = firstNode.getClosestContainer()
		const lastContainer = lastNode.getClosestContainer()
		const firstIndex = this.getIndex(firstContainer, anchorElement, anchorOffset)
		const lastIndex = this.getIndex(lastContainer, focusElement, focusOffset)
		const isForwardDirection = this.getDirection(firstIndex, lastIndex) === 'forward'
		const [ anchorNode, focusNode ] = isForwardDirection ? [ firstNode, lastNode ] : [ lastNode, firstNode ]

		if (isForwardDirection) {
			this.anchorContainer = firstContainer
			this.focusContainer = lastContainer
			this.anchorOffset = firstIndex[firstIndex.length - 1]
			this.focusOffset = lastIndex[lastIndex.length - 1]
			this.anchorIndex = firstIndex
			this.focusIndex = lastIndex
		} else {
			this.anchorContainer = lastContainer
			this.focusContainer = firstContainer
			this.anchorOffset = lastIndex[lastIndex.length - 1]
			this.focusOffset = firstIndex[firstIndex.length - 1]
			this.anchorIndex = lastIndex
			this.focusIndex = firstIndex
		}

		this.focused = true
		this.isRange = !isCollapsed
		this.anchorAtFirstPositionInContainer = this.anchorOffset === 0
		this.anchorAtLastPositionInContainer = this.anchorOffset === this.anchorContainer.getOffset()
		this.focusAtFirstPositionInContainer = this.focusOffset === 0
		this.focusAtLastPositionInContainer = this.focusOffset === this.focusContainer.getOffset()

		this.handleSelectedItems(anchorNode, focusNode)
		this.onUpdateHandlers.forEach((handler) => handler(this))
	}

	getPreparedSelection() {
		const selection = document.getSelection()
		const {
			isCollapsed,
			anchorNode,
			focusNode,
			anchorOffset,
			focusOffset
		} = selection
		const anchor = this.findSelectableElement(anchorNode, anchorOffset)
		const focus = this.findSelectableElement(focusNode, focusOffset)

		return {
			isCollapsed,
			anchorElement: anchor.element,
			anchorOffset: anchor.offset,
			focusElement: focus.element,
			focusOffset: focus.offset
		}
	}

	blur() {
		if (!this.focused) return

		this.focusedNodes.forEach((item) => {
			if (item.isWidget || item.isContainer) {
				item.onBlur(this)
			}
		})
		this.selectedItems.splice(0, this.selectedItems.length)
		this.focusedNodes.splice(0, this.focusedNodes.length)
		this.focused = false
		this.anchorContainer = null
		this.focusContainer = null
		this.anchorOffset = null
		this.focusOffset = null

		if (this.anchorContainer) {
			this.core.editing.update(this.anchorContainer)
		}

		this.onUpdateHandlers.forEach((handler) => handler(this))
	}

	onUpdate(handler) {
		this.onUpdateHandlers.push(handler)
	}

	setSelection(anchorNode, anchorOffset, focusNode, focusOffset) {
		const { element: anchorElement, index: anchorIndex } = this.getSelectionParams(
			anchorNode,
			typeof anchorOffset === 'undefined' ? 0 : anchorOffset < 0 ?
				anchorNode.getOffset() + anchorOffset + 1 : anchorOffset
		)

		if (focusNode && (anchorNode !== focusNode || anchorOffset !== focusOffset)) {
			const { element: focusElement, index: focusIndex } =
				this.getSelectionParams(focusNode, focusOffset)

			this.selectElements(anchorElement, anchorIndex, focusElement, focusIndex)
		} else if (anchorNode.isWidget) {
			anchorNode.element.focus()
			this.selectElements(anchorNode.element, 0)
		} else {
			this.selectElements(anchorElement, anchorIndex)
		}

		this.selectedItems.splice(0, this.selectedItems.length)
		this.focusedNodes.splice(0, this.focusedNodes.length)
	}

	selectElements(anchorElement, anchorOffset, focusElement, focusOffset) {
		const selection = window.getSelection()

		if (focusElement && (anchorElement !== focusElement || anchorOffset !== focusOffset)) {
			selection.setBaseAndExtent(anchorElement, anchorOffset, focusElement, focusOffset)
		} else {
			selection.collapse(anchorElement, anchorOffset)

			if (isHtmlElement(anchorElement) && anchorElement.getAttribute('data-widget') !== null) {
				anchorElement.focus()
			}
		}

		this.update({ target: anchorElement, type: 'restore' })
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

			for (let i = 0; i < parentNode.childNodes.length; i++) {
				if (parentNode.childNodes[i] === childByOffset) {
					element = parentNode
					index = i

					break
				}
			}
		}

		if (isTextElement(element)) {
			index = Math.min(index, element.nodeValue.length)
		}

		return { element, index }
	}

	restoreSelection() {
		this.setSelectionByIndexes(this.getSelectionInIndexes())
	}

	getSelectionInIndexes() {
		return {
			anchorIndex: this.anchorIndex,
			focusIndex: this.focusIndex
		}
	}

	setSelectionByIndexes(indexes) {
		const anchor = this.findElementByIndex(indexes.anchorIndex)
		const focus = this.findElementByIndex(indexes.focusIndex)

		this.selectElements(
			anchor.element,
			anchor.offset,
			focus.element,
			focus.offset
		)
	}

	getDirection(anchorIndex, focusIndex) {
		for (let i = 0; i < anchorIndex.length; i++) {
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

			while (current.previousSibling) {
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

	findElementByIndex(indexes) {
		let current = this.core.model.element

		for (let i = 0; i < indexes.length - 1; i++) {
			if (!current.childNodes[indexes[i]]) {
				return this.findSelectableElement(current, indexes[i])
			}

			current = current.childNodes[indexes[i]]
		}

		if (current.getAttribute('data-widget') === null) {
			const result = this.findElementByOffset(current, indexes[indexes.length - 1])

			if (!isTextElement(result.element)) {
				return {
					element: result.element.parentNode,
					offset: Array.prototype.indexOf.call(result.element.parentNode.childNodes, result.element)
				}
			}

			return result
		}

		return {
			element: current,
			offset: 0
		}
	}

	findElementByOffset(node, offset) {
		let restOffset = offset

		const element = walk(node, (current) => {
			if (isTextElement(current)) {
				if (current.length >= restOffset) {
					return current
				}

				restOffset -= current.length
			} else if (isElementBr(current)) {
				if (restOffset === 0) {
					return current
				}

				restOffset -= 1
			}
		})

		return { element, offset: restOffset }
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
		const itemsToFocus = []
		let focusedNodes = selectedItems.slice(0)
		let firstNode = focusedNodes[0]

		while (firstNode && firstNode !== this.anchorContainer.parent) {
			focusedNodes.unshift(firstNode)
			firstNode = firstNode.parent
		}

		focusedNodes = focusedNodes.filter((node, index, self) => self.indexOf(node) === index)
		focusedNodes.forEach((item) => {
			if ((item.isWidget || item.isContainer) && this.focusedNodes.indexOf(item) === -1) {
				itemsToFocus.push(item)
			}
		})
		this.focusedNodes.forEach((item) => {
			if ((item.isWidget || item.isContainer) && focusedNodes.indexOf(item) === -1) {
				item.onBlur(this)
			}
		})

		this.selectedItems = selectedItems
		this.focusedNodes = focusedNodes

		itemsToFocus.forEach((item) => {
			item.onFocus(this)
		})
	}

	findSelectableElement(node, offset) {
		if (!node) return {
			element: null,
			offset
		}

		let result

		if (!isTextElement(node) && (result = this.findSelectableChildNode(node, offset))) {
			return result
		}

		return {
			element: node,
			offset
		}
	}

	findSelectableChildNode(node, offset) {
		const findFirst = Boolean(node.childNodes[offset])
		const current = findFirst ? node.childNodes[offset] : node.childNodes[offset - 1]

		if (current && current.childNodes.length) {
			const result = this.findTextElement(current, findFirst)

			if (isTextElement(result)) {
				return {
					element: result,
					offset: findFirst ? 0 : result.nodeValue.length
				}
			}

			return {
				element: current,
				offset: 0
			}
		}

		return null
	}

	findTextElement(node, findFirst) {
		let current = node

		while (current.firstChild) {
			current = findFirst ? current.firstChild : current.lastChild
		}

		return current
	}

	destroy() {
		document.removeEventListener('click', this.update, true)
		document.removeEventListener('keyup', this.update, true)
		document.removeEventListener('input', this.update, true)
		document.removeEventListener('selectionchange', this.update)
	}
}
