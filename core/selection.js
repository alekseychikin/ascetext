const getNodeByElement = require('../nodes/node').getNodeByElement

class Selection {
	constructor(core) {
		this.onFocus = this.onFocus.bind(this)
		this.update = this.update.bind(this)
		this.onUpdate = this.onUpdate.bind(this)
		this.setSelection = this.setSelection.bind(this)
		this.restoreSelection = this.restoreSelection.bind(this)
		this.onClickHandler = () => setTimeout(this.update, 0)

		this.core = core
		this.selection = {}
		this.pluginControls = []
		this.anchorIndex = null
		this.focusIndex = null
		this.focused = false
		this.skipUpdate = false
		this.forceUpdate = false
		this.renderedCustomControls = false
		this.onUpdateHandlers = []

		document.addEventListener('focus', this.onFocus, true)
		document.addEventListener('click', this.onClickHandler)
		document.addEventListener('keyup', this.update)
		document.addEventListener('input', this.update)
	}

	onFocus(event) {
		if (this.core.node.contains(event.target)) {
			const anchorNode = getNodeByElement(event.target)

			if (anchorNode && anchorNode.isWidget) {
				this.setSelection(anchorNode, 0)
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

		const anchorContainer = this.getClosestContainer(anchorElement)
		const focusContainer = this.getClosestContainer(focusElement)
		const anchorContainerLength = anchorContainer.isContainer ? anchorContainer.getOffset() : 0
		const focusContainerLength = focusContainer.isContainer ? focusContainer.getOffset() : 0
		const [ anchorSelectedElement, anchorSelectedOffset ] =
			this.getSelectedElement(anchorElement, selection.anchorOffset)
		const [ focusSelectedElement, focusSelectedOffset ] =
			this.getSelectedElement(focusElement, selection.focusOffset)
		const anchorOffset = anchorSelectedOffset + anchorContainer.getOffset(anchorSelectedElement)
		const focusOffset = focusSelectedOffset + focusContainer.getOffset(focusSelectedElement)

		this.anchorIndex = this.getIndex(anchorContainer, anchorElement, selection.anchorOffset)
		this.focusIndex = this.getIndex(focusContainer, focusElement, selection.focusOffset)
		this.isForwardDirection = this.getDirection(this.anchorIndex, this.focusIndex) === 'forward'
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
			return false
		}

		this.focusedControl = false
		this.forceUpdate = false
		this.anchorContainer = anchorContainer
		this.focusContainer = focusContainer
		this.anchorOffset = anchorOffset
		this.focusOffset = focusOffset
		this.selectedItems = []

		this.onUpdateHandlers.forEach((handler) => handler(this))
	}

	blur() {
		this.focused = false
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
		const { element: anchorElement, index: anchorIndex } =
			this.getSelectionParams(anchorNode, anchorOffset)

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
		const childByOffset = node.getChildByOffset(offset)
		let element = node.element
		let index = offset

		if (node.isWidget && offset === 0) {
			return { element: node.element, index: 0 }
		} else if (childByOffset.nodeType === 3) {
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
		this.setSelection(
			this.anchorContainer,
			this.anchorOffset,
			this.focusContainer,
			this.focusOffset
		)
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
		if (element.nodeType === 3 || element.nodeType === 1 && element.tagName.toLowerCase() === 'br') {
			return [ element, offset ]
		}

		return [ element.childNodes[offset], 0 ]
	}

	getClosestContainer(element) {
		let current = element
		let node

		while (!(node = getNodeByElement(current))) {
			current = current.parentNode
		}

		return node.getClosestContainer()
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
			indexes.push(container.getOffset(element) + (element.nodeType === 3 ? offset : 0))
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
		const { anchorTail, focusHead } = this.cutRange()

		return this.getArrayRangeItems(anchorTail, focusHead)
	}

	cutRange() {
		let anchorContainer = this.anchorContainer
		let anchorOffset = this.anchorOffset
		let focusContainer = this.focusContainer
		let focusOffset = this.focusOffset
		let anchor
		let focus

		if (!this.isForwardDirection) {
			anchorContainer = this.focusContainer
			anchorOffset = this.focusOffset
			focusContainer = this.anchorContainer
			focusOffset = this.anchorOffset
		}

		const focusFirstLevelNode = this.focusContainer.getFirstLevelNode(this.focusOffset)

		focus = this.core.builder.split(
			focusFirstLevelNode,
			this.focusOffset - this.focusContainer.getOffset(focusFirstLevelNode.element)
		)

		const anchorFirstLevelNode = this.anchorContainer.getFirstLevelNode(this.anchorOffset)

		anchor = this.core.builder.split(
			anchorFirstLevelNode,
			this.anchorOffset - this.anchorContainer.getOffset(anchorFirstLevelNode.element)
		)

		return {
			anchorHead: anchor.head,
			anchorTail: anchor.tail,
			focusHead: anchorFirstLevelNode === focus.head ? anchor.tail : focus.head,
			focusTail: focus.tail
		}
	}

	getArrayRangeItems(since, until) {
		let current = since
		const selectedItems = []

		while (current) {
			selectedItems.push(current)

			if (current.first && !current.isWidget) {
				current = current.first

				continue
			}

			if (current === until) {
				break
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

	destroy() {
		document.removeEventListener('focus', this.onFocus, true)
		document.removeEventListener('click', this.onClickHandler)
		document.removeEventListener('keyup', this.update)
		document.removeEventListener('input', this.update)
	}

	// addPluginControl(control) {
	// 	this.pluginControls.push(control)
	// }

	// removePluginControl(control) {
	// 	this.pluginControls.splice(this.pluginControls.indexOf(control), 1)
	// }
}

module.exports = Selection
