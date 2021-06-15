const getStyle = require('./utils/getStyle')
const getNodeByElement = require('./nodes/node').getNodeByElement
const anyToolbarContains = require('./toolbar').anyToolbarContains
const Toolbar = require('./toolbar')
const createElement = require('./create-element')

class Selection {
	constructor(core) {
		this.onMouseDown = this.onMouseDown.bind(this)
		this.update = this.update.bind(this)
		this.onAnchorContainerReplace = this.onAnchorContainerReplace.bind(this)
		this.onFocusContainerReplace = this.onFocusContainerReplace.bind(this)
		this.controlHandler = this.controlHandler.bind(this)
		this.showControls = this.showControls.bind(this)
		this.hideControls = this.hideControls.bind(this)
		this.onUpdate = this.onUpdate.bind(this)

		this.core = core
		this.controls = createElement('div', {
			'class': 'rich-editor__controls hidden'
		})
		this.selection = {}
		this.focusedNodes = []
		this.pluginControls = []
		this.anchorIndex = null
		this.focusIndex = null
		this.focused = false
		this.skipUpdate = false
		this.forceUpdate = false
		this.renderedCustomControls = false
		this.toolbar = new Toolbar(this.controls)
		this.onUpdateHandlers = []

		document.addEventListener('mousedown', this.onMouseDown)
		document.addEventListener('mouseup', this.update)
		document.addEventListener('keyup', this.update)
		document.addEventListener('input', this.update)
	}

	onMouseDown(event) {
		if (this.core.node.contains(event.target)) {
			const anchorNode = getNodeByElement(event.target)

			if (anchorNode && anchorNode.isWidget) {
				this.setSelection(anchorNode, 0)
			}
		}
	}

	blur() {
		this.focused = false
		this.anchorContainer = null
		this.focusContainer = null
		this.anchorOffset = null
		this.focusOffset = null

		this.hideControls()
		this.blurFocusedNodes()

		if (process.env.ENV === 'develop') {
			this.core.devTool.renderSelection({
				anchorIndex: [],
				focusIndex: []
			})
		}
	}

	update() {
		const selection = document.getSelection()
		const { anchorNode: anchorElement, focusNode: focusElement, isCollapsed } = selection

		if (anyToolbarContains(anchorElement)) {
			console.log('focused control')

			return false
		}

		if (this.skipUpdate) {
			console.log('skip')

			return false
		}

		if (!this.core.node.contains(anchorElement) || !this.core.node.contains(focusElement)) {
			this.blur()

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

		if (process.env.ENV === 'develop') {
			this.core.devTool.renderSelection({
				anchorIndex: this.anchorIndex,
				focusIndex: this.focusIndex,
				aafp: this.anchorAtFirstPositionInContainer,
				aalp: this.anchorAtLastPositionInContainer,
				fafp: this.focusAtFirstPositionInContainer,
				falp: this.focusAtLastPositionInContainer,
				rng: this.isRange
			})
		}

		if (
			!this.forceUpdate &&
			this.anchorContainer === anchorContainer &&
			this.focusContainer === focusContainer &&
			this.anchorOffset === anchorOffset &&
			this.focusOffset === focusOffset
		) {
			return false
		}

		if (this.anchorContainer) {
			delete this.anchorContainer.onReplace
		}

		if (this.focusContainer) {
			delete this.focusContainer.onReplace
		}

		this.focusedControl = false
		this.forceUpdate = false
		this.anchorContainer = anchorContainer
		this.focusContainer = focusContainer
		this.anchorOffset = anchorOffset
		this.focusOffset = focusOffset
		this.selectedItems = []

		anchorContainer.onReplace = this.onFocusContainerReplace
		anchorContainer.onReplace = this.onAnchorContainerReplace

		if (this.isRange) {
			// this.blurFocusedNodes()
			// this.getSelectedItems()
		} else {
			// this.handleFocusedElement()
		}

		// this.updateToolbar()
		this.onUpdateHandlers.forEach((handler) => handler(this))
	}

	onUpdate(handler) {
		this.onUpdateHandlers.push(handler)
	}

	onAnchorContainerReplace(replacement) {
		if (this.anchorContainer === this.focusContainer) {
			this.focusContainer = replacement
		}

		this.anchorContainer = replacement
		this.forceUpdate = true
	}

	onFocusContainerReplace(replacement) {
		this.focusContainer = replacement
		this.forceUpdate = true
	}

	setSelection(anchorNode, anchorOffset, focusNode, focusOffset) {
		const sel = window.getSelection()
		const { element: anchorElement, index: anchorIndex } =
			this.getSelectionParams(anchorNode, anchorOffset)

		if (focusNode) {
			const { element: focusElement, index: focusIndex } =
				this.getSelectionParams(focusNode, focusOffset)

			sel.setBaseAndExtent(anchorElement, anchorIndex, focusElement, focusIndex)
		} else {
			sel.collapse(anchorElement, anchorIndex)
		}

		this.update()
	}

	// eslint-disable-next-line class-methods-use-this
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

	// не нравится
	// eslint-disable-next-line class-methods-use-this
	getSelectedElement(element, offset) {
		if (element.nodeType === 3 || element.nodeType === 1 && element.tagName.toLowerCase() === 'br') {
			return [ element, offset ]
		}

		return [ element.childNodes[offset], 0 ]
	}

	// eslint-disable-next-line class-methods-use-this
	getClosestContainer(element) {
		let current = element
		let node

		while (!(node = getNodeByElement(current))) {
			current = current.parentNode
		}

		return node.getClosestContainer()
	}

	// eslint-disable-next-line class-methods-use-this
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

	blurFocusedNodes() {
		this.focusedNodes.forEach((node) => {
			if (typeof node.onBlur === 'function') {
				node.onBlur()
			}
		})

		this.focusedNodes = []
	}

	getSelectedItems() {
		const { anchorTail, focusHead } = this.cutRange()
		let current = anchorTail
		const selectedItems = []

		while (current) {
			selectedItems.push(current)

			if (current === focusHead) {
				break
			}

			if (current.first) {
				current = current.first

				continue
			}

			if (current.next) {
				current = current.next

				continue
			}

			if (current.parent) {
				current = current.parent

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

	cutRange() {
		let isAnchorTailEqualFocusHead = false
		let anchor
		let focus

		if (this.isForwardDirection) {
			const focusFirstLevelNode = this.focusContainer.getFirstLevelNode(this.focusOffset)

			focus = focusFirstLevelNode.split(
				this.focusOffset - this.focusContainer.getOffset(focusFirstLevelNode.element)
			)

			const anchorFirstLevelNode = this.anchorContainer.getFirstLevelNode(this.anchorOffset)

			isAnchorTailEqualFocusHead = anchorFirstLevelNode === focus.head
			anchor = anchorFirstLevelNode.split(
				this.anchorOffset - this.anchorContainer.getOffset(anchorFirstLevelNode.element)
			)
		} else {
			const focusFirstLevelNode = this.anchorContainer.getFirstLevelNode(this.anchorOffset)

			focus = focusFirstLevelNode.split(
				this.anchorOffset - this.anchorContainer.getOffset(focusFirstLevelNode.element)
			)

			const anchorFirstLevelNode = this.focusContainer.getFirstLevelNode(this.focusOffset)

			isAnchorTailEqualFocusHead = anchorFirstLevelNode === focus.head
			anchor = anchorFirstLevelNode.split(
				this.focusOffset - this.focusContainer.getOffset(anchorFirstLevelNode.element)
			)
		}

		return {
			anchorHead: anchor.head,
			anchorTail: anchor.tail,
			focusHead: isAnchorTailEqualFocusHead ? anchor.tail : focus.head,
			focusTail: focus.tail
		}
	}

	updateToolbar() {
		this.renderedCustomControls = false

		if (this.isRange) {
			this.renderControls()
		} else {
			this.hideControls()
		}
	}

	// TODO придумать как можно не перерендеривать кнопки на каждый выделенный символ
	renderControls(controls = null) {
		let selectedControls = []

		if (controls === null) {
			Object.keys(this.core.plugins).forEach((type) => {
				if (this.core.plugins[type].getSelectControls) {
					selectedControls = selectedControls.concat(this.core.plugins[type].getSelectControls(this))
				}
			})
		} else {
			selectedControls = controls
			this.renderedCustomControls = true
		}

		if (selectedControls.length) {
			this.emptyTooltip()

			selectedControls.forEach((control) => {
				let field

				for (field in control.params) {
					if (typeof control.params[field] === 'function') {
						control.setEventListener(this.controlHandler, field)
					}
				}

				this.controls.appendChild(control.getElement())
			})

			this.showControls()
		}
	}

	handleFocusedElement() {
		const focusedElement =
			this.anchorContainer.getChildByOffset(this.anchorOffset)
		let focusedNode = getNodeByElement(focusedElement)
		const focusedNodes = []

		while (focusedNode !== this.anchorContainer.parent) {
			focusedNodes.push(focusedNode)
			focusedNode = focusedNode.parent
		}

		this.focusedNodes.forEach((node) => {
			if (focusedNodes.indexOf(node) === -1) {
				if (typeof node.onBlur === 'function') {
					node.onBlur()
				}
			}
		})

		focusedNodes.forEach((node) => {
			if (this.focusedNodes.indexOf(node) === -1) {
				if (typeof node.onFocus === 'function') {
					node.onFocus(this)
				}
			}
		})

		this.focusedNodes = focusedNodes
	}

	controlHandler(action, event) {
		action(event, this)

		if (!this.renderedCustomControls) {
			this.restoreSelection()
		}
	}

	emptyTooltip() {
		this.controls.innerHTML = ''
	}

	showControls() {
		const container = this.anchorContainer
		const scrollTop = document.body.scrollTop || document.documentElement.scrollTop
		const containerBoundingClientRect = container.element.getBoundingClientRect()
		const offsetTop = containerBoundingClientRect.top + scrollTop
		const offsetLeft = containerBoundingClientRect.left

		if (!this.isShowControls) {
			const styles = getStyle(container.element)

			this.containerAvatar = document.createElement('div')
			this.containerAvatar.style.position = 'absolute'
			this.containerAvatar.style.top = '0'
			this.containerAvatar.style.left = '-99999%'
			this.containerAvatar.style.width = container.offsetWidth
			this.containerAvatar.style.fontFamily = styles.fontFamily
			this.containerAvatar.style.fontSize = styles.fontSize
			this.containerAvatar.style.lineHeight = styles.lineHeight
			this.containerAvatar.style.padding = styles.padding
			this.containerAvatar.style.boxSizing = styles.boxSizing
			this.containerAvatar.style.width = styles.width

			this.isShowControls = true

			document.body.appendChild(this.containerAvatar)
		} else {
			this.containerAvatar.innerHTML = ''
		}

		const content = container.element.outerText
		const selectedLength = this.focusOffset - this.anchorOffset
		const fakeContent = content.substr(0, this.anchorOffset) +
			'<span data-selected-text>' +
			content.substr(this.anchorOffset, selectedLength) +
			'</span>' +
			content.substr(this.focusOffset)

		this.containerAvatar.innerHTML = fakeContent

		const selectedText = this.containerAvatar.querySelector('span[data-selected-text]')

		document.body.appendChild(this.controls)
		this.controls.style.top = offsetTop + selectedText.offsetTop - 10 + 'px'
		this.controls.style.left = offsetLeft +
			selectedText.offsetLeft +
			selectedText.offsetWidth / 2 -
			this.controls.offsetWidth / 2 + 'px'
		this.controls.classList.remove('hidden')
	}

	hideControls() {
		if (this.isShowControls) {
			this.controls.classList.add('hidden')
			this.containerAvatar && this.containerAvatar.parentNode.removeChild(this.containerAvatar)
			this.isShowControls = false
			document.body.removeChild(this.controls)
		}
	}

	// addPluginControl(control) {
	// 	this.pluginControls.push(control)
	// }

	// removePluginControl(control) {
	// 	this.pluginControls.splice(this.pluginControls.indexOf(control), 1)
	// }
}

module.exports = Selection
