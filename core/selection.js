import Publisher from './publisher.js'
import isElementBr from '../utils/is-element-br.js'
import isTextElement from '../utils/is-text-element.js'
import walk from '../utils/walk.js'
import isHtmlElement from '../utils/is-html-element.js'
import isFunction from '../utils/is-function.js'
import { hasRoot } from '../utils/find-parent.js'

export default class Selection extends Publisher {
	constructor(core) {
		super()

		this.update = this.update.bind(this)
		this.setSelection = this.setSelection.bind(this)
		this.pointerDown = this.pointerDown.bind(this)
		this.restoreSelection = this.restoreSelection.bind(this)
		this.focus = this.focus.bind(this)
		this.selectionChange = this.selectionChange.bind(this)
		this.onRender = this.onRender.bind(this)
		this.getSelectedItems = this.getSelectedItems.bind(this)

		this.core = core
		this.anchorIndex = null
		this.focusIndex = null
		this.focused = false
		this.selectedComponent = false
		this.selectedItems = []
		this.focusedNodes = []
		this.components = []
		this.timer = null
		this.anchorAtFirstPositionInContainer = false
		this.anchorAtLastPositionInContainer = false
		this.focusAtFirstPositionInContainer = false
		this.focusAtLastPositionInContainer = false
		this.isRange = false
		this.anchorContainer = null
		this.focusContainer = null
		this.anchorOffset = 0
		this.focusOffset = 0

		document.addEventListener('focus', this.focus, true)
		document.addEventListener('selectionchange', this.selectionChange)
		document.addEventListener('pointerdown', this.pointerDown)
		this.core.render.subscribe(this.onRender)
	}

	setComponents(components) {
		this.components = components
	}

	focus(event) {
		if (!document.body.contains(event.srcElement)) {
			return
		}

		if (this.core.node.contains(event.srcElement) && (typeof event.srcElement.dataset.widget === 'undefined' || this.core.node === event.srcElement)) {
			this.selectionChange()

			return
		}

		this.selectionUpdate({
			type: 'focus',
			anchorNode: event.srcElement,
			focusNode: event.srcElement,
			anchorOffset: 0,
			focusOffset: 0,
			isCollapsed: true,
			selectedComponent: Boolean(this.checkSelectedComponent(event.srcElement))
		})
	}

	selectionChange() {
		const selection = document.getSelection()

		if (this.core.node.contains(selection.anchorNode) && this.core.node.contains(selection.focusNode)) {
			this.selectionUpdate({
				type: 'selectionchange',
				anchorNode: selection.anchorNode,
				focusNode: selection.focusNode,
				anchorOffset: selection.anchorOffset,
				focusOffset: selection.focusOffset,
				isCollapsed: selection.isCollapsed,
				selectedComponent: Boolean(this.checkSelectedComponent(selection.anchorNode))
			})
		}
	}

	pointerDown(event) {
		if (!this.checkSelectedComponent(event.srcElement) && !this.core.node.contains(event.target)) {
			this.update({
				anchorContainer: null,
				anchorOffset: 0,
				focusContainer: null,
				focusOffset: 0,
				isCollapsed: true,
				focused: false,
				selectedComponent: false
			})
		}
	}

	checkSelectedComponent(node) {
		return this.components.find((component) => component.checkSelection(node))
	}

	selectionUpdate(event) {
		const { container: anchorContainer, offset: anchorOffset } = this.getContainerAndOffset(event.anchorNode, event.anchorOffset)
		let focusContainer = anchorContainer
		let focusOffset = anchorOffset

		if (!event.isCollapsed) {
			const focus = this.getContainerAndOffset(event.focusNode, event.focusOffset)

			focusContainer = focus.container
			focusOffset = focus.offset
		}

		const focused = this.core.node.contains(anchorContainer) && this.core.node.contains(focusContainer)

		this.update({
			anchorContainer: focused ? this.core.render.getNodeById(anchorContainer.dataset.nodeId) : null,
			anchorOffset,
			focusContainer: focused ? this.core.render.getNodeById(focusContainer.dataset.nodeId) : null,
			focusOffset,
			isCollapsed: event.isCollapsed,
			focused,
			selectedComponent: event.selectedComponent
		})
	}

	getContainerAndOffset(node, offset) {
		let container = node
		let element = node
		let length = offset

		if (isHtmlElement(element)) {
			if (element.dataset.nodeId) {
				if (element.childNodes[offset]) {
					return this.getContainerAndOffset(element.childNodes[offset], 0)
				}

				return {
					container,
					offset
				}
			}

			if (element.childNodes.length > offset) {
				return this.getContainerAndOffset(element.childNodes[offset], 0)
			}

			if (element.childNodes[offset - 1]) {
				return this.getContainerAndOffset(element.childNodes[offset - 1], this.getLength(element.childNodes[offset - 1]))
			}
		}

		while (element.previousSibling || element.parentNode) {
			if (!element.previousSibling) {
				element = element.parentNode

				if (isHtmlElement(element) && element.dataset.nodeId) {
					container = element

					break
				}

				continue
			}

			element = element.previousSibling
			length += this.getLength(element)
		}

		return {
			container,
			offset: length
		}
	}

	getLength(node) {
		if (isTextElement(node)) {
			return node.length
		}

		if (isElementBr(node)) {
			return 1
		}

		let length = 0
		let child = node.firstChild

		while (child) {
			length += this.getLength(child)

			child = child.nextSibling
		}

		return length
	}

	setSelection(anchorNode, anchorOffset = 0, focusNode, focusOffset) {
		const correctAnchorOffset = anchorOffset < 0 ? anchorNode.length : anchorOffset
		const correctFocusOffset = focusNode ? focusOffset < 0 ? focusNode.length : focusOffset : correctAnchorOffset

		this.update({
			anchorContainer: anchorNode,
			anchorOffset: correctAnchorOffset,
			focusContainer: focusNode || anchorNode,
			focusOffset: correctFocusOffset,
			isCollapsed: focusNode ? anchorNode === focusNode && correctAnchorOffset === correctFocusOffset : true,
			focused: true,
			selectedComponent: false
		})
		this.selectElements()
	}

	onRender(node) {
		if (node === this.anchorContainer || node === this.focusContainer) {
			this.selectElements()
		}
	}

	selectElements() {
		if (!this.anchorContainer.isRendered || !this.focusContainer.isRendered) {
			return
		}

		const selection = window.getSelection()
		const { element: anchorElement, restOffset: anchorRestOffset } = this.getChildByOffset(this.anchorContainer, this.anchorOffset)
		const { element: focusElement, restOffset: focusRestOffset } = this.getChildByOffset(this.focusContainer, this.focusOffset)

		selection.setBaseAndExtent(anchorElement, anchorRestOffset, focusElement, focusRestOffset)

		if (this.anchorContainer.isWidget) {
			anchorElement.focus()
		}
	}

	getChildByOffset(target, offset) {
		let restOffset = Math.min(offset, target.length)

		if (target.isWidget && !offset) {
			return {
				element: target.element,
				restOffset: 0
			}
		}

		const result = walk(target.element, (current) => {
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

		return {
			element: result,
			restOffset
		}
	}

	update(event) {
		if (!event.focused && !event.selectedComponent) {
			return this.blur()
		}

		if (event.selectedComponent) {
			// TODO: make fake selection
			return
		}

		if (!hasRoot(event.anchorContainer) || !hasRoot(event.focusContainer)) {
			console.warn('skip selection')
			return
		}

		const firstContainer = event.anchorContainer
		const lastContainer = event.focusContainer
		const firstIndex = this.getIndex(firstContainer, event.anchorOffset)
		const lastIndex = this.getIndex(lastContainer, event.focusOffset)
		const isForwardDirection = this.getDirection(firstIndex, lastIndex) === 'forward'

		if (isForwardDirection) {
			this.anchorContainer = firstContainer
			this.focusContainer = lastContainer
			this.anchorOffset = event.anchorOffset
			this.focusOffset = event.focusOffset
			this.anchorIndex = firstIndex
			this.focusIndex = lastIndex
		} else {
			this.anchorContainer = lastContainer
			this.focusContainer = firstContainer
			this.anchorOffset = event.focusOffset
			this.focusOffset = event.anchorOffset
			this.anchorIndex = lastIndex
			this.focusIndex = firstIndex
		}

		this.focused = true
		this.selectedComponent = event.selectedComponent
		this.isRange = !event.isCollapsed
		this.anchorAtFirstPositionInContainer = this.anchorOffset === 0
		this.anchorAtLastPositionInContainer = this.anchorOffset === this.anchorContainer.length
		this.focusAtFirstPositionInContainer = this.focusOffset === 0
		this.focusAtLastPositionInContainer = this.focusOffset === this.focusContainer.length

		this.handleSelectedItems()
		this.sendMessage(this)
	}

	blur() {
		if (!this.focused) {
			return
		}

		this.focusedNodes.forEach((item) => {
			if ((item.isWidget || item.isContainer)) {
				if (isFunction(item.onBlur)) {
					item.onBlur(this)
				}

				if (item.isWidget && item.isRendered) {
					item.element.removeAttribute('data-focus')
				}
			}
		})
		this.selectedItems.splice(0)
		this.focusedNodes.splice(0)
		this.focused = false
		this.anchorContainer = null
		this.focusContainer = null
		this.anchorOffset = null
		this.focusOffset = null
		this.sendMessage(this)
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

	findElementByIndex(indexes, parent = this.core.model) {
		let current = parent

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
		let restOffset = Math.min(node.length, offset)
		let current = node.first

		if (node.isWidget && !offset) {
			return node
		}

		if (!node.first) {
			return node
		}

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

		return this.getArrayRangeItems(head, tail)
	}

	cutRange(
		anchorContainer = this.anchorContainer,
		anchorOffset = this.anchorOffset,
		focusContainer = this.focusContainer,
		focusOffset = this.focusOffset
	) {
		const focus = this.core.builder.splitByOffset(focusContainer, focusOffset)
		const selectedSingleElement = focus.head === this.getNodeByOffset(anchorContainer, anchorOffset)
		const anchor = this.core.builder.splitByOffset(anchorContainer, anchorOffset)

		return {
			head: anchor.tail,
			tail: selectedSingleElement
				? anchor.tail.deepesetLastNode()
				: focus.head.deepesetLastNode()
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

	handleSelectedItems() {
		const selectedItems = this.getArrayRangeItems(
			this.getNodeByOffset(this.anchorContainer, this.anchorOffset),
			this.getNodeByOffset(this.focusContainer, this.focusOffset)
		)
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
				if (isFunction(item.onBlur)) {
					item.onBlur(this)
				}

				if (item.isWidget && item.isRendered) {
					item.element.removeAttribute('data-focus')
				}
			}
		})

		this.selectedItems = selectedItems
		this.focusedNodes = focusedNodes

		itemsToFocus.forEach((item) => {
			if (isFunction(item.onFocus)) {
				item.onFocus(this)
			}
		})
		this.focusedNodes.forEach((item) => {
			if (item.isWidget && item.isRendered) {
				item.element.setAttribute('data-focus', '')
			}
		})
	}

	destroy() {
		document.removeEventListener('focus', this.focus, true)
		document.removeEventListener('selectionchange', this.selectionChange)
	}
}
