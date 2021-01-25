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

		this.core = core
		this.controls = createElement('div', {
			'class': 'rich-editor__controls hidden'
		})
		this.selection = {}
		this.focusedNodes = []
		this.pluginControls = []
		this.focused = false
		this.skipUpdate = false
		this.forceUpdate = false
		this.renderedCustomControls = false
		this.toolbar = new Toolbar(this.controls)
		this.onUpdate = function () {}

		document.addEventListener('selectionchange', this.update)
		document.addEventListener('mousedown', this.onMouseDown)
		document.addEventListener('input', this.update)
	}

	onMouseDown(event) {
		if (this.core.node.contains(event.target)) {
			// console.log('onMouseDown contains')
			const anchorNode = getNodeByElement(event.target)

			if (anchorNode && anchorNode.isWidget) {
				this.setSelection(anchorNode.element, 0)
			}
		} else {
			// console.log('onMouseDown not contains')
			this.update()
		}
	}

	blur() {
		console.log('blur')

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
		// console.error('updateSelection')

		const selection = document.getSelection()
		const { anchorNode: anchorElement, focusNode: focusElement, isCollapsed } = selection

		// console.log('anchorElement', anchorElement, 'focusElement', focusElement)
		// console.log(this.anchorContainer)

		if (anyToolbarContains(anchorElement)) {
			console.log('focused control')

			return false
		}

		if (this.skipUpdate) {
			console.log('skip')

			return false
		}

		if (!this.core.node.contains(anchorElement) || !this.core.node.contains(focusElement)) {
			console.log('updateSelection blur')
			this.blur()

			return false
		}

		const anchorIndex = this.findIndex(anchorElement)
		const focusIndex = this.findIndex(focusElement)

		anchorIndex.push(selection.anchorOffset)
		focusIndex.push(selection.focusOffset)

		this.isForwardDirection = this.getDirection(anchorIndex, focusIndex) === 'forward'
		this.focused = true
		this.isRange = !isCollapsed

		const anchorContainer = this.getClosestContainer(anchorElement)
		const focusContainer = this.getClosestContainer(focusElement)
		const anchorContainerLength = anchorContainer.isContainer ? this.getOffset(anchorContainer.element) : 0
		const focusContainerLength = focusContainer.isContainer ? this.getOffset(focusContainer.element) : 0
		const [ anchorSelectedElement, anchorSelectedOffset ] = this.getSelectedElement(anchorElement, selection.anchorOffset)
		const [ focusSelectedElement, focusSelectedOffset ] = this.getSelectedElement(focusElement, selection.focusOffset)
		const anchorOffset = anchorSelectedOffset + this.getOffset(
			anchorContainer.element,
			anchorSelectedElement
		)
		const focusOffset = focusSelectedOffset + this.getOffset(
			focusContainer.element,
			focusSelectedElement
		)

		this.anchorAtFirstPositionInContainer = anchorOffset === 0
		this.anchorAtLastPositionInContainer = anchorOffset === anchorContainerLength

		this.focusAtFirstPositionInContainer = focusOffset === 0
		this.focusAtLastPositionInContainer = focusOffset === focusContainerLength

		if (process.env.ENV === 'develop') {
			this.core.devTool.renderSelection({
				anchorIndex: anchorIndex,
				focusIndex: focusIndex,
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
			// console.log('same selection')
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
			if (this.anchorContainer.isChanged) {
				this.core.editing.updateContainer(this.anchorContainer)
			}

			if (this.focusContainer.isChanged) {
				this.core.editing.updateContainer(this.focusContainer)
			}

			// this.setSelectedItems()
		} else {
			this.handleFocusedElement()
		}

		this.updateToolbar()
		this.onUpdate()
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

	setSelection(anchorElement, anchorOffset, focusElement, focusOffset) {
		const [ anchorRestOffset, anchorChildByOffset ] = this.getChildByOffset(
			anchorElement,
			Math.min(this.getOffset(anchorElement), anchorOffset)
		)
		const sel = window.getSelection()

		if (focusElement) {
			const [ focusRestOffset, focusChildByOffset ] = this.getChildByOffset(
				focusElement,
				Math.min(this.getOffset(focusElement), focusOffset)
			)

			sel.setBaseAndExtent(anchorChildByOffset, anchorRestOffset, focusChildByOffset, focusRestOffset)
		} else {
			sel.collapse(anchorChildByOffset, anchorRestOffset)
		}
	}

	// TODO: forceUpdate выглядит как костыль. Хочется чтобы восстановление выделения было без него
	restoreSelection(forceUpdate = true) {
		console.log('restoreSelection')
		this.forceUpdate = forceUpdate
		this.setSelection(
			this.anchorContainer.element,
			this.anchorOffset,
			this.focusContainer.element,
			this.focusOffset
		)
	}

	getSelectedElement(element, offset) {
		if (element.nodeType === 3 || element.nodeType === 1 && element.tagName.toLowerCase() === 'br') {
			return [ element, offset ]
		} else {
			return [ element.childNodes[offset], 0 ]
		}
	}

	getOffset(container, element) {
		const [ offset ] = this.calcOffset(container, element)

		return offset
	}

	calcOffset(container, element) {
		let offset = 0
		let i

		for (i = 0; i < container.childNodes.length; i++) {
			if (container.childNodes[i] === element) {
				return [ offset, true ]
			}

			if (container.childNodes[i].nodeType === 3) {
				offset += container.childNodes[i].length
			} else if (
				container.childNodes[i].nodeType === 1 &&
				container.childNodes[i].tagName.toLowerCase() === 'br' &&
				container.lastChild !== container.childNodes[i]
			) {
				offset += 1
			} else if (container.childNodes[i].childNodes) {
				const [ subOffset, returnOffset ] = this.calcOffset(container.childNodes[i], element)

				offset += subOffset

				if (returnOffset) {
					return [ offset, true ]
				}
			}
		}

		return [ offset, false ]
	}

	getClosestContainer(element) {
		let current = element
		let node

		while (!(node = getNodeByElement(current))) {
			current = current.parentNode
		}

		return node.getClosestContainer()
	}

	getChildByOffset(element, offset, leftEdge) {
		let restOffset = offset
		let restIsOnEdge = false
		let lastChild
		let i
		let child
		const node = getNodeByElement(element)

		if (node && node.isWidget) {
			return [ offset, element, false ]
		}

		if (element.nodeType === 3) {
			return [ offset, element ]
		} else {
			for (i = 0; i < element.childNodes.length; i++) {
				child = element.childNodes[i]

				if (child.nodeType === 3) {
					if (leftEdge && child.length === restOffset) {
						if (
							child.nextSibling &&
							child.nextSibling.nodeType === 1 &&
							child.nextSibling.tagName.toLowerCase() === 'br'
						) {
							return [ restOffset, child, false ]
						} else {
							lastChild = child
							restIsOnEdge = true
							restOffset -= child.length
						}
					} else if (child.length > restOffset || (!leftEdge && child.length >= restOffset)) {
						return [ restOffset, child, false ]
					} else {
						restOffset -= child.length
					}
				} else if (child.nodeType === 1 && child.tagName.toLowerCase() === 'br') {
					if (restOffset === 0) {
						return [ restOffset, child, false ]
					} else {
						restOffset -= 1
					}
				} else if (child.childNodes) {
					const [ subRestOffset, subChild, isOnEdge ] = this.getChildByOffset(child, restOffset, leftEdge)

					restOffset = subRestOffset
					restIsOnEdge = isOnEdge

					if (subChild) {
						if (isOnEdge) {
							lastChild = subChild
						} else {
							return [ restOffset, subChild, false ]
						}
					}
				}
			}
		}

		return [ restOffset, lastChild, restIsOnEdge ]
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

	findIndex(element) {
		const indexes = []
		let index
		let current = element

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

		return indexes
	}

	setSelectedItems() {
		console.log('setSelectedItems')
		const { anchorTail, focusTail, anchorFirstLevelNode, focusFirstLevelNode } = this.cutRange()
		const anchorContainer = this.isForwardDirection ? this.anchorContainer : this.focusContainer
		const focusContainer = this.isForwardDirection ? this.focusContainer : this.anchorContainer
		let current
		let finish
		let container = anchorContainer
		let selectedItems = []

		if (this.isForwardDirection) {
			current = anchorTail || anchorFirstLevelNode
			finish = focusTail || (anchorFirstLevelNode === focusFirstLevelNode ? current.next : focusFirstLevelNode.next)
		} else {
			// TODO: очень сомнительное место. Нужно перепроверить все пограничных состояниях
			current = anchorTail || (
				anchorFirstLevelNode === focusFirstLevelNode
					? anchorFirstLevelNode
					: focusFirstLevelNode.next
						? focusFirstLevelNode.next
						: anchorFirstLevelNode
			)
			finish = focusTail || current.next
		}

		do {
			selectedItems.push(current)

			if (current.first) {
				selectedItems = selectedItems.concat(this.getNodeChildren(current.first))
			}

			if (current.next) {
				current = current.next
			} else if (container !== focusContainer) {
				container = container.getNextSelectableNode()

				while (container && !container.first) {
					container = container.getNextSelectableNode()
				}

				if (!container) {
					break
				}

				selectedItems.push(container)
				current = container.first
			} else {
				break
			}
		} while (current && current !== finish)

		this.selectedItems = selectedItems
		this.blurFocusedNodes()
	}

	blurFocusedNodes() {
		this.focusedNodes.forEach((node) => {
			if (typeof node.onBlur === 'function') {
				node.onBlur()
			}
		})

		this.focusedNodes = []
	}

	getNodeChildren(node) {
		let children = []
		let current = node

		do {
			children.push(current)

			if (current.first) {
				children = children.concat(this.getNodeChildren(current.first))
			}

			current = current.next
		} while (current)

		return children
	}

	cutRange() {
		const anchorFirstLevelNode = this.getFirstLevelNode(this.anchorContainer, this.anchorOffset, true)
		const focusFirstLevelNode = this.getFirstLevelNode(this.focusContainer, this.focusOffset)
		let anchorTail
		let focusTail

		if (this.isForwardDirection) {
			focusTail = focusFirstLevelNode.split(this.focusOffset - this.getOffset(
				this.focusContainer.element,
				focusFirstLevelNode.element
			))

			anchorTail = anchorFirstLevelNode.split(this.anchorOffset - this.getOffset(
				this.anchorContainer.element,
				anchorFirstLevelNode.element
			))
		} else {
			focusTail = anchorFirstLevelNode.split(this.anchorOffset - this.getOffset(
				this.anchorContainer.element,
				anchorFirstLevelNode.element
			))

			anchorTail = focusFirstLevelNode.split(this.focusOffset - this.getOffset(
				this.focusContainer.element,
				focusFirstLevelNode.element
			))
		}

		this.setSelection(
			this.anchorContainer.element,
			this.anchorOffset,
			this.focusContainer.element,
			this.focusOffset
		)

		return { anchorTail, focusTail, anchorFirstLevelNode, focusFirstLevelNode }
	}

	getFirstLevelNode(container, offset, leftEdge) {
		const [ , selectedElement ] = this.getChildByOffset(container.element, offset, leftEdge)
		let firstLevelNode = getNodeByElement(selectedElement)

		while (firstLevelNode.parent !== container) {
			firstLevelNode = firstLevelNode.parent
		}

		return firstLevelNode
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
	renderControls(controls) {
		let selectedControls = []

		if (typeof controls === 'undefined') {
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
		const [ , focusedElement ] = this.getChildByOffset(this.anchorContainer.element, this.anchorOffset)
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
