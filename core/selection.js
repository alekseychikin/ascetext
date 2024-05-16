import isElementBr from '../utils/is-element-br.js'
import isTextElement from '../utils/is-text-element.js'
import walk from '../utils/walk.js'

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

		this.core.host.onSelectionChange(this.update)
	}

	update(event) {
		if (!event.focused && !event.selectedComponent) {
			return this.blur()
		}

		if (event.selectedComponent) {
			// TODO: make fake selection
			return
		}

		console.error('selection update')
		console.log(event.anchorContainer, event.anchorOffset, event.focusContainer, event.focusOffset, event.isCollapsed)

		const firstContainer = event.anchorContainer
		const lastContainer = event.focusContainer
		const firstIndex = this.getIndex(firstContainer, event.anchorOffset)
		const lastIndex = this.getIndex(lastContainer, event.focusOffset)
		const isForwardDirection = this.getDirection(firstIndex, lastIndex) === 'forward'

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
		this.isRange = !event.isCollapsed
		this.anchorAtFirstPositionInContainer = this.anchorOffset === 0
		this.anchorAtLastPositionInContainer = this.anchorOffset === this.anchorContainer.length
		this.focusAtFirstPositionInContainer = this.focusOffset === 0
		this.focusAtLastPositionInContainer = this.focusOffset === this.focusContainer.length

		this.handleSelectedItems(
			this.getNodeByOffset(this.anchorContainer, this.anchorOffset),
			this.getNodeByOffset(this.focusContainer, this.focusOffset)
		)
		this.onUpdateHandlers.forEach((handler) => handler(this))
	}

	blur() {
		if (!this.focused) return

		this.focusedNodes.forEach((item) => {
			if (item.isWidget || item.isContainer) {
				item.onBlur(this)
			}
		})
		this.selectedItems.splice(0)
		this.focusedNodes.splice(0)
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

		return () => {
			this.onUpdateHandlers.splice(this.onUpdateHandlers.indexOf(handler), 1)
		}
	}

	setSelection(anchorNode, anchorOffset = 0, focusNode, focusOffset) {
		console.warn('setSelection', anchorNode, anchorOffset, focusNode, focusOffset)
		this.selectedItems.splice(0)
		this.focusedNodes.splice(0)
		this.core.host.selectElements(anchorNode, anchorOffset, focusNode, focusOffset)
	}

	restoreSelection() {
		const indexes = this.getSelectionInIndexes()

		console.error('restore', indexes.anchorIndex, indexes.focusIndex)

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

		this.setSelection(
			anchor.node,
			anchor.offset,
			focus.node,
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

	getIndex(container, offset) {
		const indexes = []
		let index
		let current = container

		while (current !== this.core.model) {
			index = 0

			while (current.previous) {
				index++
				current = current.previous
			}

			indexes.unshift(index)
			current = current.parent
		}

		indexes.push(offset)

		return indexes
	}

	findElementByIndex(indexes) {
		let current = this.core.model

		for (let i = 0; i < indexes.length - 1; i++) {
			current = current.first

			for (let j = 0; j < indexes[i]; j++) {
				current = current.next
			}
		}

		return {
			node: current,
			offset: indexes[indexes.length - 1]
		}
	}

	getNodeByOffset(node, offset) {
		let restOffset = offset
		let current = node.first

		while (current && restOffset >= 0) {
			if (restOffset <= current.length) {

				if (current.first) {
					return this.getNodeByOffset(current, restOffset)
				}

				return current
			}

			restOffset -= current.length
			current = current.next
		}

		return current
	}

	getSelectedItems() {
		const { head, tail } = this.cutRange()
		console.log('aftercut', head, tail)

		return this.getArrayRangeItems(head, tail)
	}

	cutRange(
		anchorContainer = this.anchorContainer,
		anchorOffset = this.anchorOffset,
		focusContainer = this.focusContainer,
		focusOffset = this.focusOffset
	) {
		const focus = this.core.builder.split(focusContainer, focusOffset)
		const selectedSingleElement = focus.head === this.getNodeByOffset(anchorContainer, anchorOffset)
		const anchor = this.core.builder.split(anchorContainer, anchorOffset)
		const anchorNextContainer = anchorContainer.getNextSelectableNode()
		const focusPreviousContainer = focusContainer.getPreviousSelectableNode()
		const selectedFromFirstPositionToFirstPosition = !anchor.head && !focus.head

		if (selectedFromFirstPositionToFirstPosition) {
			return {
				head: anchorContainer,
				tail: focusPreviousContainer.last
					? focusPreviousContainer.last
					: focusPreviousContainer
			}
		}

		return {
			head: anchor.tail
				? anchor.tail
				: anchorNextContainer,
			tail: focus.head
				? selectedSingleElement
					? anchor.tail.deepesetLastNode()
					: focus.head.deepesetLastNode()
				: focusContainer
		}
	}

	getArrayRangeItems(since, until) {
		const selectedItems = []
		let current = since

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

	destroy() {
		document.removeEventListener('click', this.update, true)
		document.removeEventListener('keyup', this.update, true)
		document.removeEventListener('input', this.update, true)
		document.removeEventListener('selectionchange', this.update)
	}
}
