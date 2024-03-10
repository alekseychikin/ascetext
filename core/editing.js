import isFunction from '../utils/is-function.js'
import createShortcutMatcher from '../utils/create-shortcut-matcher.js'
import { operationTypes } from './timetravel.js'

const backspaceKey = 8
const deletekey = 46
const enterKey = 13
const leftKey = 37
const upKey = 38
const rightKey = 39
const downKey = 40
const shiftKey = 16
const ctrlKey = 17
const optionKey = 18
const metaKey = 91
const escapeKey = 27
const zKey = 90
const spaceKey = 32
const isMac = navigator.userAgent.includes('Macintosh')
const modifyKeyCodes = [ enterKey, backspaceKey, deletekey ]
const metaKeyCodes = [ leftKey, upKey, rightKey, downKey, shiftKey, ctrlKey, optionKey, metaKey, escapeKey ]
const forbiddenShortcuts = [ 'ctrl+b/meta+b', 'ctrl+i/meta+i', 'ctrl+u/meta+u' ]

export default class Editing {
	constructor(core) {
		this.handleRemoveRange = this.handleRemoveRange.bind(this)
		this.handleBackspace = this.handleBackspace.bind(this)
		this.handleBackspaceKeyDown = this.handleBackspaceKeyDown.bind(this)
		this.handleDelete = this.handleDelete.bind(this)
		this.handleDeleteKeyDown = this.handleDeleteKeyDown.bind(this)
		this.handleEnterKeyDownRange = this.handleEnterKeyDownRange.bind(this)
		this.handleEnterKeyDownSingle = this.handleEnterKeyDownSingle.bind(this)
		this.handleEnterKeyDown = this.handleEnterKeyDown.bind(this)
		this.handleModifyKeyDown = this.handleModifyKeyDown.bind(this)
		this.update = this.update.bind(this)
		this.onKeyDown = this.onKeyDown.bind(this)
		this.onKeyUp = this.onKeyUp.bind(this)
		this.onCompositionStart = this.onCompositionStart.bind(this)
		this.onCompositionEnd = this.onCompositionEnd.bind(this)
		this.onInput = this.onInput.bind(this)
		this.onPaste = this.onPaste.bind(this)
		this.onCut = this.onCut.bind(this)
		this.getTopNode = this.getTopNode.bind(this)
		this.rerender = this.rerender.bind(this)
		this.selectionUpdate = this.selectionUpdate.bind(this)

		this.node = core.node
		this.core = core
		this.updatingContainers = []
		this.modifyKeyHandlerParams = {}
		this.scheduleTimer = null
		this.isSession = false
		this.isUpdating = false
		this.spacesDown = false
		this.lastSelection = null
		this.lastSelectionIndexes = null
		this.hadKeydown = false
		this.keydownTimer = null

		this.node.addEventListener('mousedown', this.onMouseDown)
		this.node.addEventListener('keydown', this.onKeyDown)
		this.node.addEventListener('keyup', this.onKeyUp)
		this.node.addEventListener('input', this.onInput)
		this.node.addEventListener('cut', this.onCut)
		this.node.addEventListener('paste', this.onPaste)
		this.node.addEventListener('compositionstart', this.onCompositionStart)
		this.node.addEventListener('compositionend', this.onCompositionEnd)

		this.core.selection.onUpdate(() => setTimeout(this.selectionUpdate, 0))
		this.core.builder.onChange((change) => {
			if (change.type !== operationTypes.ATTRIBUTE) {
				this.scheduleUpdate(change.container)
			}
		})
	}

	selectionUpdate() {
		const { selection } = this.core

		this.lastSelection = selection.selectedItems
		this.lastSelectionIndexes = selection.getSelectionInIndexes()
	}

	onCompositionStart() {
		this.core.timeTravel.preservePreviousSelection()
		this.isSession = true
	}

	onCompositionEnd() {
		this.isSession = false
		this.setKeydown()
		this.scheduleUpdate(this.core.selection.anchorContainer)
		this.update()
	}

	onInput(event) {
		const { selection, timeTravel, builder } = this.core

		if (selection.anchorContainer && selection.anchorContainer.inputHandler) {
			selection.anchorContainer.inputHandler()
		}

		if (!this.hadKeydown && !this.isSession) {
			let nextNode
			let parentNode
			const containers = [this.lastSelection[0].getClosestContainer()]
				.concat(this.lastSelection.filter((node) => node.isContainer || node.isWidget))
				.filter((node, index, self) => self.indexOf(node) === index)

			if (containers.length === 1) {
				timeTravel.preservePreviousSelection()
				timeTravel.previousSelection = this.lastSelectionIndexes
				this.scheduleUpdate(containers[0])
				this.update()
			} else if (containers.length > 1) {
				const insertNode = builder.create('text', { content: event.data || '' })
				const topNodes = this.lastSelection.map(this.getTopNode)
					.filter((node, index, self) => self.indexOf(node) === index)

				topNodes.forEach((node) => {
					nextNode = node.next
					parentNode = node.parent

					if (node.element.parentNode) {
						node.element.parentNode.removeChild(node.element)
					}
				})
				topNodes.forEach(this.rerender)
				topNodes.forEach((node) => {
					if (nextNode) {
						parentNode.element.insertBefore(node.element, nextNode.element)
					} else {
						parentNode.element.appendChild(node.element)
					}
				})
				selection.setSelectionByIndexes(this.lastSelectionIndexes)
				this.handleRemoveRange()
				timeTravel.preservePreviousSelection()

				builder.insert(selection.anchorContainer, insertNode, selection.anchorOffset)
				this.lastSelection = null
				this.lastSelectionIndexes = null
			}
		}
	}

	getTopNode(node) {
		let current = node

		while (current.parent.type !== 'root') {
			current = current.parent
		}

		return current
	}

	rerender(node) {
		let current = node.first

		if (node.element.parentNode) {
			node.element.parentNode.removeChild(node.element)
		}

		node.setElement(node.render())

		while (current) {
			this.rerender(current)

			node.element.appendChild(current.element)
			current = current.next
		}
	}

	onKeyDown(event) {
		const { selection, timeTravel, components, host } = this.core
		const shortrcutMatcher = createShortcutMatcher(event)
		let shortcutHandler

		this.setKeydown()

		if (selection.focused) {
			const undoRepeat = event.keyCode === zKey && (isMac && event.metaKey || !isMac && event.ctrlKey)
			const singleKeyPessed = !metaKeyCodes.includes(event.keyCode) && !event.metaKey && !event.altKey && !event.ctrlKey
			const modifyKeyPressed = modifyKeyCodes.includes(event.keyCode)

			if (undoRepeat) {
				event.preventDefault()
				this.update()

				if (event.shiftKey) {
					timeTravel.goForward()
				} else {
					timeTravel.goBack()
				}
			} else if (!selection.isRange && (shortcutHandler = this.catchShortcut(shortrcutMatcher, selection.anchorContainer.shortcuts))) {
				shortcutHandler(event, this.getModifyKeyHandlerParams())
			} else if (components.find((component) => component.catchShortcut(shortrcutMatcher, event))) {
				event.preventDefault()
			} else if (forbiddenShortcuts.find((item) => shortrcutMatcher(item))) {
				event.preventDefault()
			} else if (singleKeyPessed || modifyKeyPressed) {
				timeTravel.preservePreviousSelection()

				if (modifyKeyPressed) {
					this.handleModifyKeyDown(event)
				} else {
					this.handleRemoveRange()

					if (event.keyCode === spaceKey && !this.spacesDown) {
						this.update()
						timeTravel.commit()
						timeTravel.preservePreviousSelection()
						event.preventDefault()

						// это надо перенести в хост
						const { node, element } = host.getChildByOffset(selection.anchorContainer, selection.anchorOffset)
						const offset = selection.anchorOffset - host.getOffset(selection.anchorContainer, element)
						const needNbsp = !offset || offset === element.nodeValue.length || element.nodeValue[offset] === ' ' || element.nodeValue[offset - 1] === ' '
						const content = element.nodeValue.substr(0, offset) + (needNbsp ? '\u00A0' : ' ') + element.nodeValue.substr(offset)

						node.attributes.content = content
						element.nodeValue = content
						selection.setSelection(selection.anchorContainer, selection.anchorOffset + 1)
						this.spacesDown = true
					}

					this.scheduleUpdate(selection.anchorContainer)
				}
			}
		}
	}

	onKeyUp(event) {
		const { timeTravel } = this.core

		if (event.keyCode === spaceKey) {
			this.update()
			this.spacesDown = false
			timeTravel.commit()
			timeTravel.preservePreviousSelection()
		}
	}

	setKeydown() {
		this.hadKeydown = true
		this.keydownTimer = setTimeout(() => this.hadKeydown = false, 10)
	}

	handleModifyKeyDown(event) {
		switch (event.keyCode) {
			case backspaceKey:
				if (
					!this.core.selection.isRange &&
					this.core.selection.anchorAtFirstPositionInContainer
				) {
					this.update()
					this.core.timeTravel.preservePreviousSelection()
				}

				this.handleBackspaceKeyDown(event)
				break
			case deletekey:
				if (
					!this.core.selection.isRange &&
					this.core.selection.focusAtLastPositionInContainer
				) {
					this.update()
					this.core.timeTravel.preservePreviousSelection()
				}

				this.handleDeleteKeyDown(event)
				break
			case enterKey:
				if (!this.core.selection.isRange) {
					this.update()
					this.core.timeTravel.preservePreviousSelection()
				}

				this.handleEnterKeyDown(event)
				break
		}
	}

	handleRemoveRange() {
		if (!this.core.selection.isRange) {
			return ''
		}

		const selectedItems = this.core.selection.getSelectedItems()
		const containersForRemove = []
		let index
		let firstContainer
		let nextSelectableNode
		let children
		let returnHtmlValue = ''
		let returnTextValue = ''

		if (!selectedItems.length) {
			return ''
		}

		if (!selectedItems[0].isContainer && !selectedItems[0].isWidget) {
			const { since, until } = this.captureSinceAndUntil(selectedItems, 0)

			firstContainer = selectedItems[0].getClosestContainer()

			if (!firstContainer.isEmpty) {
				this.core.builder.cutUntil(since, until)
				children = this.core.stringify(since)
				returnHtmlValue += children
				returnTextValue += children
					.replace(/<br\s*?\/?>/g, '\n')
					.replace(/(<([^>]+)>)/ig, '') + '\n'
			}
		}

		selectedItems.forEach((item) => {
			if (item.isContainer || item.isWidget) {
				containersForRemove.push(item)
			}
		})

		if (containersForRemove.length) {
			const lastContainer = containersForRemove[containersForRemove.length - 1]

			nextSelectableNode = lastContainer.getNextSelectableNode()
			index = selectedItems.indexOf(lastContainer)

			if (lastContainer.isContainer) {
				const { until } = this.captureSinceAndUntil(selectedItems, index + 1)
				const since = until
					? until.next
					: lastContainer.isContainer && !lastContainer.isEmpty && lastContainer.first

				if (since) {
					if (!firstContainer) {
						firstContainer = selectedItems[0].getClosestContainer().getPreviousSelectableNode()
					}

					if (firstContainer.isContainer) {
						this.core.builder.append(firstContainer, since)

						if (firstContainer.inputHandler) {
							firstContainer.inputHandler()
						}
					}
				}
			}
		}

		containersForRemove.forEach((container) => {
			const children = this.core.stringify(container.first)

			returnHtmlValue += container.stringify(children)
			returnTextValue += children
				.replace(/<br\s*?\/?>/g, '\n')
				.replace(/(<([^>]+)>)/ig, '') + '\n'
		})

		for (index = containersForRemove.length - 1; index >= 0; index--) {
			this.core.builder.cut(containersForRemove[index])
		}

		if (firstContainer && firstContainer.isContainer) {
			this.scheduleUpdate(firstContainer)
			this.core.selection.setSelection(
				firstContainer,
				this.core.selection.anchorIndex[this.core.selection.anchorIndex.length - 1]
			)
		} else if (nextSelectableNode) {
			this.core.selection.setSelection(nextSelectableNode)
		}

		return {
			html: returnHtmlValue,
			text: returnTextValue
		}
	}

	captureSinceAndUntil(items, startIndex) {
		const since = items[startIndex]
		let until = since
		let index = startIndex

		for (; index < items.length; index++) {
			if (items[index].isWidget || items[index].isContainer || items[index].isGroup) {
				break
			}

			if (items[index].parent && (
				items[index].parent.isWidget || items[index].parent.isContainer || items[index].parent.isGroup
			)) {
				until = items[index]
			}
		}

		return { since, until }
	}

	handleBackspaceKeyDown(event) {
		if (this.core.selection.isRange) {
			event.preventDefault()
			this.handleRemoveRange()
			this.update()
		} else {
			this.handleBackspace(event)
		}
	}

	handleBackspace(event) {
		if (isFunction(this.core.selection.anchorContainer.backspaceHandler)) {
			this.core.selection.anchorContainer.backspaceHandler(
				event,
				this.getModifyKeyHandlerParams()
			)

			if (event.defaultPrevented) {
				this.update()
			} else {
				this.scheduleUpdate(this.core.selection.anchorContainer)
			}
		} else {
			event.preventDefault()
			console.warn('must be backspaceHandler on ', this.core.selection.anchorContainer)
		}
	}

	handleDeleteKeyDown(event) {
		if (this.core.selection.isRange) {
			event.preventDefault()
			this.handleRemoveRange()
			this.core.timeTravel.commit()
		} else {
			this.handleDelete(event)
		}
	}

	handleDelete(event) {
		if (isFunction(this.core.selection.anchorContainer.deleteHandler)) {
			this.core.selection.anchorContainer.deleteHandler(
				event,
				this.getModifyKeyHandlerParams()
			)

			if (event.defaultPrevented) {
				this.update()
			} else {
				this.scheduleUpdate(this.core.selection.anchorContainer)
			}
		} else {
			event.preventDefault()
			console.warn('must be deleteHandler on ', this.core.selection.anchorContainer)
		}
	}

	handleEnterKeyDown(event) {
		if (this.core.selection.isRange) {
			this.handleEnterKeyDownRange(event)
		} else {
			this.handleEnterKeyDownSingle(event)
		}
	}

	handleEnterKeyDownRange(event) {
		event.preventDefault()
		this.handleRemoveRange()

		if (isFunction(this.core.selection.anchorContainer.enterHandler)) {
			this.core.selection.anchorContainer.enterHandler(
				event,
				this.getModifyKeyHandlerParams()
			)
		}
	}

	handleEnterKeyDownSingle(event) {
		event.preventDefault()

		if (isFunction(this.core.selection.anchorContainer.enterHandler)) {
			this.core.selection.anchorContainer.enterHandler(
				event,
				this.getModifyKeyHandlerParams()
			)
			this.core.timeTravel.commit()
		} else {
			console.info('must be enterHandler on ', this.core.selection.anchorContainer)
			event.preventDefault()
		}
	}

	getModifyKeyHandlerParams() {
		this.modifyKeyHandlerParams.builder = this.core.builder
		this.modifyKeyHandlerParams.anchorOffset = this.core.selection.anchorOffset
		this.modifyKeyHandlerParams.focusOffset = this.core.selection.focusOffset
		this.modifyKeyHandlerParams.setSelection = this.core.selection.setSelection
		this.modifyKeyHandlerParams.restoreSelection = this.core.selection.restoreSelection
		this.modifyKeyHandlerParams.anchorAtFirstPositionInContainer = this.core.selection.anchorAtFirstPositionInContainer
		this.modifyKeyHandlerParams.anchorAtLastPositionInContainer = this.core.selection.anchorAtLastPositionInContainer
		this.modifyKeyHandlerParams.focusAtFirstPositionInContainer = this.core.selection.focusAtFirstPositionInContainer
		this.modifyKeyHandlerParams.focusAtLastPositionInContainer = this.core.selection.focusAtLastPositionInContainer
		this.modifyKeyHandlerParams.anchorContainer = this.core.selection.anchorContainer
		this.modifyKeyHandlerParams.focusContainer = this.core.selection.focusContainer
		this.modifyKeyHandlerParams.focused = this.core.selection.focused
		this.modifyKeyHandlerParams.focusedNodes = this.core.selection.focusedNodes
		this.modifyKeyHandlerParams.isLockPushChange = this.core.timeTravel.isLockPushChange

		return this.modifyKeyHandlerParams
	}

	scheduleUpdate(container) {
		this.isChanged = true

		if (this.core.timeTravel.isLockPushChange || this.isUpdating) {
			return
		}

		if (this.scheduleTimer !== null) {
			clearTimeout(this.scheduleTimer)
		}

		if (this.updatingContainers.indexOf(container) === -1) {
			this.updatingContainers.push(container)
		}

		this.scheduleTimer = setTimeout(this.update, 350)
	}

	update() {
		clearTimeout(this.scheduleTimer)
		this.scheduleTimer = null

		const { builder, selection, host } = this.core
		let container

		this.isUpdating = true

		while (!this.isSession && (container = this.updatingContainers.pop())) {
			if (container.isContainer && container.isMount) {
				// console.error('update', container.element)
				const compare = builder.parseVirtualTree(host.getVirtualTree(container.element.firstChild)).first

				this.syncTrees(container.first, compare)
				// console.log(container)
				// нужно сравнить left и right, и сделать череду манипуляций с нодами:
				// append, cut, setAttribute для изменённого текста
				// left можно будет выбросить, а right обновится до актуального состояния
				// без пересоздания реальных дом-нод

				// if (first) {
				// 	this.restorePreviousState(first)
				// 	builder.cutUntil(first)
				// }

				// if (content) {
				// 	builder.append(container, content)
				// }
			}
		}

		this.isUpdating = false

		if (selection.focused) {
			selection.restoreSelection()
		}

		this.core.timeTravel.commit()
	}

	syncTrees(target, compare) {
		const { builder } = this.core
		let left = target
		let right = compare
		let next

		while (left) {
			if (!right) {
				console.log('remove', left)
				next = left.next
				builder.cut(left)
				left = next

				continue
			}

			if (left.type === right.type) {
				if (!this.equalAttributes(left, right)) {
					builder.setAttributes(left, { ...right.attributes })
				}

				this.syncTrees(left.first, right.first)
			} else {
				next = left.next
				builder.cut(left)
				left = next

				continue
			}

			if (!left.next) {
				right = right.next

				break
			}

			left = left.next
			right = right.next
		}

		if (right) {
			builder.append(left.parent, right)
		}
	}

	equalAttributes(left, right) {
		let attribute

		for (attribute in left.attributes) {
			if (right.attributes[attribute] !== left.attributes[attribute]) {
				return false
			}
		}

		for (attribute in right.attributes) {
			if (right.attributes[attribute] !== left.attributes[attribute]) {
				return false
			}
		}

		return true
	}

	// может быть не нужен
	restorePreviousState(node) {
		let current = node
		let next

		while (current) {
			if (!current.element.parentNode) {
				if (next = this.findNextElement(current)) {
					current.parent.element.insertBefore(current.element, next)
				} else {
					current.parent.element.appendChild(current.element)
				}
			}

			if (current.type === 'text') {
				current.setNodeValue(current.attributes.content)
			} else if (current.first) {
				this.restorePreviousState(current.first)
			}

			current = current.next
		}
	}

	findNextElement(node) {
		let current = node.next

		while (current) {
			if (current.element.parentNode) {
				return current.element
			}

			current = current.next
		}

		return null
	}

	save() {
		if (this.core.selection.anchorContainer) {
			this.update()
		}
	}

	onCut(event) {
		if (this.core.selection.isRange) {
			this.core.timeTravel.preservePreviousSelection()

			const removed = this.handleRemoveRange()
			const clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData

			clipboardData.setData('text/html', '<meta charset="utf-8">' + removed.html)
			clipboardData.setData('text/plain', removed.text)
		}

		event.preventDefault()
	}

	onPaste(event) {
		let paste = (event.clipboardData || window.clipboardData).getData('text/html')
		const doc = document.createElement('div')

		if (!paste.length) {
			paste = (event.clipboardData || window.clipboardData).getData('text')
		}

		console.log(paste)

		doc.innerHTML = paste

		const result = this.core.builder.parse(doc)

		this.handleRemoveRange()
		this.core.timeTravel.preservePreviousSelection()

		this.core.builder.insert(this.core.selection.anchorContainer, result, this.core.selection.anchorOffset)

		this.core.selection.restoreSelection()
		this.core.timeTravel.commit()
		event.preventDefault()
	}

	getClosestContainerInSection(node) {
		let current = node

		while (current) {
			if ((current.isContainer || current.isWidget) && current.parent.isSection) {
				return current
			}

			current = current.parent
		}
	}

	catchShortcut(shortcutMatcher, shortcuts) {
		let shortcut

		for (shortcut in shortcuts) {
			if (shortcutMatcher(shortcut)) {
				return shortcuts[shortcut]
			}
		}

		return false
	}

	destroy() {
		this.node.removeEventListener('paste', this.onPaste)
		this.node.removeEventListener('cut', this.onCut)
		this.node.removeEventListener('keydown', this.onKeyDown)
	}
}
