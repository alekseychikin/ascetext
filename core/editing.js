import isFunction from '../utils/is-function.js'
import createShortcutMatcher from '../utils/create-shortcut-matcher.js'
import findParent from '../utils/find-parent.js'

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

		this.core.selection.subscribe(() => setTimeout(this.selectionUpdate, 0))
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

	onInput() {
		const { selection } = this.core

		if (selection.anchorContainer && isFunction(selection.anchorContainer.inputHandler)) {
			selection.anchorContainer.inputHandler()
		}

		if (!this.hadKeydown && !this.isSession) {
			this.handleRemoveRange()
			this.update(selection.anchorContainer)
		}
	}

	onKeyDown(event) {
		const { selection, timeTravel, components } = this.core
		const shortrcutMatcher = createShortcutMatcher(event)
		let shortcutHandler

		if (selection.focused) {
			const undoRepeat = event.keyCode === zKey && (isMac && event.metaKey || !isMac && event.ctrlKey)
			const singleKeyPessed = !metaKeyCodes.includes(event.keyCode) && !event.metaKey && !event.altKey && !event.ctrlKey
			const modifyKeyPressed = modifyKeyCodes.includes(event.keyCode)

			this.setKeydown()

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
						this.core.render.dropRender()
						timeTravel.commit()
						timeTravel.preservePreviousSelection()
						this.spacesDown = true
					}

					this.scheduleUpdate(selection.anchorContainer)
				}
			}
		}
	}

	onKeyUp(event) {
		if (event.keyCode === spaceKey) {
			this.spacesDown = false
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

	findCommonParent() {
		let parent = this.core.selection.anchorContainer.parent

		while (parent && (!parent.contains(this.core.selection.focusContainer) || !parent.isSection)) {
			parent = parent.parent
		}

		return parent
	}

	getOffsetToParent(parent, target) {
		let offset = 0
		let current = target

		while (current !== parent) {
			while (current.previous) {
				current = current.previous

				offset += current.length
			}

			current = current.parent
		}


		return offset
	}
	handleRemoveRange() {
		if (!this.core.selection.isRange) {
			return ''
		}

		const commonParent = this.findCommonParent()
		console.log('commonParent', commonParent)
		console.log(this.getOffsetToParent(commonParent, this.core.selection.anchorContainer) + this.core.selection.anchorOffset)
		console.log(this.getOffsetToParent(commonParent, this.core.selection.focusContainer) + this.core.selection.focusOffset)
		const anchorOffset = this.getOffsetToParent(commonParent, this.core.selection.anchorContainer) + this.core.selection.anchorOffset
		const focusOffset = this.getOffsetToParent(commonParent, this.core.selection.focusContainer) + this.core.selection.focusOffset
		const anchor =  this.core.builder.split(commonParent, anchorOffset)
		const since = anchor.tail
		let until = anchor.tail
		let focus
		let current = since
		let returnHtmlValue = ''
		let returnTextValue = ''

		if (anchorOffset !== focusOffset) {
			focus = this.core.builder.split(commonParent, focusOffset)
			until = focus.head
		}

		console.log(since)
		console.log(until)

		while (current) {
			console.log('current', current)
			const children = this.core.stringify(current.first)

			returnHtmlValue += current.stringify(children)
			returnTextValue += children
				.replace(/<br\s*?\/?>/g, '\n')
				.replace(/(<([^>]+)>)/ig, '') + '\n'

			if (current === until) {
				break
			}

			current = current.next
		}

		this.core.builder.cutUntil(since, until)
		console.log(returnHtmlValue)
		console.log(returnTextValue)

		const previousSelectableNode = anchor.head.next.getPreviousSelectableNode()
		const nextSelectableNode = previousSelectableNode.getNextSelectableNode()

		if (previousSelectableNode && nextSelectableNode) {
			this.core.builder.combine(previousSelectableNode, nextSelectableNode)
			// this.core.builder.append(previousSelectableNode.parent, nextSelectableNode, previousSelectableNode.next)
			// this.core.builder.moveTail(nextSelectableNode, previousSelectableNode, 0)
			// this.core.builder.cut(nextSelectableNode)
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
		let item

		for (; index < items.length; index++) {
			item = items[index]

			if (item.isWidget || item.isContainer || item.isGroup) {
				break
			}

			if (item.parent && (
				item.parent.isWidget || item.parent.isContainer || item.parent.isGroup
			)) {
				until = item
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
			// this.core.timeTravel.commit()
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
			// this.core.timeTravel.commit()
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

	update(node) {
		const { builder, parser } = this.core
		let container

		clearTimeout(this.scheduleTimer)
		this.scheduleTimer = null

		if (this.isUpdating) {
			return
		}

		if (node && this.updatingContainers.indexOf(node) === -1) {
			this.updatingContainers.push(node)
		}

		this.isUpdating = true

		while (!this.isSession && (container = this.updatingContainers.pop())) {
			if (container.isContainer) {
				const replacement = builder.parseVirtualTree(parser.getVirtualTree(container.element.firstChild)).first

				builder.cutUntil(container.first)
				builder.append(container, replacement)
			}
		}

		this.isUpdating = false
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
		const doc = document.createElement('div')
		const { builder } = this.core
		let paste = (event.clipboardData || window.clipboardData).getData('text/html')

		if (!paste.length) {
			paste = (event.clipboardData || window.clipboardData).getData('text')
		}

		console.log(paste)

		doc.innerHTML = paste

		const result = builder.parseVirtualTree(this.core.parser.getVirtualTree(doc.firstChild))

		this.handleRemoveRange()

		builder.insert(result)
		// тут нужно выделить вставляемый фрагмент
		// с позивии anchorContainer.anchorOffset по самый последний элемент

		// this.core.selection.restoreSelection()
		// this.core.timeTravel.commit()
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
