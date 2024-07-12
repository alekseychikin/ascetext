import isFunction from '../utils/is-function.js'
import createShortcutMatcher from '../utils/create-shortcut-matcher.js'
import findParent from '../utils/find-parent.js'
import Section from '../nodes/section.js'

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
		this.handleBackspaceKeyDown = this.handleBackspaceKeyDown.bind(this)
		this.handleDeleteKeyDown = this.handleDeleteKeyDown.bind(this)
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
		this.onCopy = this.onCopy.bind(this)

		this.node = core.node
		this.core = core
		this.updatingContainers = []
		this.modifyKeyHandlerParams = {}
		this.scheduleTimer = null
		this.isSession = false
		this.isUpdating = false
		this.spacesDown = false
		this.hadKeydown = false
		this.removedRange = false
		this.keydownTimer = null

		this.node.addEventListener('mousedown', this.onMouseDown)
		this.node.addEventListener('keydown', this.onKeyDown)
		this.node.addEventListener('keyup', this.onKeyUp)
		this.node.addEventListener('input', this.onInput)
		this.node.addEventListener('cut', this.onCut)
		this.node.addEventListener('copy', this.onCopy)
		this.node.addEventListener('paste', this.onPaste)
		this.node.addEventListener('compositionstart', this.onCompositionStart)
		this.node.addEventListener('compositionend', this.onCompositionEnd)
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
		const { selection } = this.core

		if (selection.anchorContainer && isFunction(selection.anchorContainer.inputHandler)) {
			selection.anchorContainer.inputHandler()
		}

		if (!this.hadKeydown && !this.isSession) {
			this.handleRemoveRange()
			this.update(selection.anchorContainer)
		}

		if (this.hadKeydown && this.removedRange && event.data) {
			this.insertText(event.data)
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
						// timeTravel.preservePreviousSelection()
						this.spacesDown = true
					}

					if (!this.removedRange) {
						// console.log('scheduleUpdate')
						this.scheduleUpdate(selection.anchorContainer)
					}
				}
			}
		}
	}

	onKeyUp(event) {
		if (event.code === 'Space') {
			this.spacesDown = false
		}

		if (event.code === 'Backspace' && !this.core.selection.isRange) {
			this.core.selection.selectionChange()
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
			this.removedRange = false

			return ''
		}

		const { anchorContainer, anchorOffset, focusContainer, focusOffset} = this.core.selection
		const focus = this.core.builder.splitByTail(this.core.model, this.core.builder.splitByOffset(focusContainer, focusOffset).tail)
		const anchor = this.core.builder.splitByOffset(anchorContainer, anchorOffset)
		const { head: anchorHead, tail: since } = this.core.builder.splitByTail(this.core.model, anchor.tail)
		const until = anchorContainer === focusContainer ? since : focus.tail.previous

		console.log('since', since)
		console.log('until', until)

		this.removedRange = true
		this.core.builder.cutUntil(since, until)

		const previousSelectableNode = anchorHead.next.getPreviousSelectableNode()
		const nextSelectableNode = previousSelectableNode.getNextSelectableNode()

		console.log(previousSelectableNode)
		console.log(nextSelectableNode)

		if (previousSelectableNode && nextSelectableNode) {
			this.core.builder.combine(previousSelectableNode, nextSelectableNode)
			// this.core.builder.append(previousSelectableNode.parent, nextSelectableNode, previousSelectableNode.next)
			// this.core.builder.moveTail(nextSelectableNode, previousSelectableNode, 0)
			// this.core.builder.cut(nextSelectableNode)
		}

		return {
			since,
			until
		}
	}

	handleBackspaceKeyDown(event) {
		if (this.core.selection.isRange) {
			event.preventDefault()
			this.handleRemoveRange()
			this.update()
		} else if (isFunction(this.core.selection.anchorContainer.backspaceHandler)) {
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
		} else if (isFunction(this.core.selection.anchorContainer.deleteHandler)) {
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
		event.preventDefault()

		if (this.core.selection.isRange) {
			this.handleRemoveRange()
		}

		if (isFunction(this.core.selection.anchorContainer.enterHandler)) {
			this.core.selection.anchorContainer.enterHandler(
				event,
				this.getModifyKeyHandlerParams()
			)
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
				builder.append(container, replacement || builder.create('text', { content: '' }))
			}
		}

		this.isUpdating = false
	}

	save() {
		if (this.core.selection.anchorContainer) {
			this.update()
		}
	}

	onCut(event) {
		if (this.core.selection.isRange) {
			this.core.timeTravel.preservePreviousSelection()

			const section = new Section('root')
			const { since } = this.handleRemoveRange()
			const clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData

			this.core.builder.append(section, since)
			this.copyToClipboard(clipboardData, section)
		}

		event.preventDefault()
	}

	onCopy(event) {
		if (this.core.selection.isRange) {
			const clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData

			const { builder, selection } = this.core
			const section = new Section('root')
			const indexes = selection.getSelectionInIndexes()
			const anchorIndex = indexes.anchorIndex.slice()
			const focusIndex = indexes.focusIndex.slice()
			const { node: first } = selection.findElementByIndex(anchorIndex.slice(0, 2))
			const { node: last } = selection.findElementByIndex(focusIndex.slice(0, 2))
			const payload = builder.getJson(first, last)

			builder.append(section, builder.parseJson(payload))
			focusIndex[0] -= anchorIndex[0]
			anchorIndex[0] = 0

			const { node: focusContainer, offset: focusOffset } = selection.findElementByIndex(focusIndex, section)
			const { node: anchorContainer, offset: anchorOffset } = selection.findElementByIndex(anchorIndex, section)
			const focus = builder.splitByTail(section, builder.splitByOffset(focusContainer, focusOffset).tail)
			const anchor = builder.splitByOffset(anchorContainer, anchorOffset)
			const { tail: since } = builder.splitByTail(section, anchor.tail)
			const until = anchorContainer === focusContainer ? since : focus.tail.previous

			if (section.first !== since) {
				builder.cutUntil(section.first, since.previous)
			}

			builder.cutUntil(until.next)
			this.copyToClipboard(clipboardData, section)
		}

		event.preventDefault()
	}

	copyToClipboard(clipboardData, section) {
		let htmlValue = ''
		let textValue = ''
		let current = section.first
		const nodes = []

		while (current) {
			nodes.push(current)

			current = current.next
		}

		this.core.normalizer.normalize(nodes)
		current = section.first

		while (current) {
			const children = this.core.stringify(current.first)

			htmlValue += current.stringify(children)
			textValue += children
				.replace(/<br\s*?\/?>/g, '\n')
				.replace(/(<([^>]+)>)/ig, '') + '\n'

			current = current.next
		}

		clipboardData.setData('text/html', '<meta charset="utf-8">' + htmlValue)
		clipboardData.setData('text/plain', textValue)
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

		this.core.timeTravel.preservePreviousSelection()
		this.handleRemoveRange()

		builder.insert(result)
		event.preventDefault()
	}

	insertText(content) {
		const { selection, builder } = this.core
		const node = selection.getNodeByOffset(selection.anchorContainer, selection.anchorOffset)
		const { tail } = builder.splitByOffset(node.parent, selection.anchorOffset - this.getNodeOffset(selection.anchorContainer, node.parent))
		let attributes = {}

		if (node && node.type === 'text') {
			attributes = { ...node.attributes }
		}

		builder.append(node.parent, builder.create('text', { ...attributes, content }), tail)
		selection.setSelection(selection.anchorContainer, selection.anchorOffset + content.length)
	}

	getNodeOffset(container, node) {
		let offset = 0
		let current = node

		while (current !== container) {
			if (current.previous) {
				current = current.previous
			} else {
				current = current.parent

				continue
			}

			offset += current.length
		}

		return offset
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
