import isFunction from '../utils/is-function.js'
import createShortcutMatcher from '../utils/create-shortcut-matcher.js'
import Section from '../nodes/section.js'
import nbsp from '../utils/nbsp.js'

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
const modifyKeyCodes = [ enterKey, backspaceKey, deletekey, leftKey, rightKey ]
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
		this.modifyKeyHandlerParams = {
			builder: core.builder,
			setSelection: core.selection.setSelection,
			restoreSelection: core.selection.restoreSelection
		}
		this.scheduleTimer = null
		this.keydownTimer = null
		this.isSession = false
		this.isUpdating = false
		this.spacesDown = false
		this.hadKeydown = false
		this.removedRange = false

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
			selection.anchorContainer.inputHandler(true)
		}

		if (!this.hadKeydown && !this.isSession) {
			this.handleRemoveRange()
			this.update(selection.anchorContainer)

			if (event.data) {
				selection.setSelection(selection.anchorContainer, selection.anchorOffset + event.data.length)
			}
		}

		if (this.hadKeydown && this.removedRange && event.data) {
			this.insertText(event.data)
		}

		if (event.data) {
			this.core.autocomplete.trigger(event.data)
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
			} else if (shortcutHandler = this.catchShortcut(shortrcutMatcher, selection.anchorContainer.shortcuts)) {
				this.syncContainer(selection.anchorContainer)
				shortcutHandler(event, this.getModifyKeyHandlerParams())
				this.core.builder.commit()
			} else if (components.find((component) => component.catchShortcut(shortrcutMatcher, event))) {
				event.preventDefault()
			} else if (forbiddenShortcuts.find((item) => shortrcutMatcher(item))) {
				event.preventDefault()
			} else if (singleKeyPessed || modifyKeyPressed) {
				timeTravel.preservePreviousSelection()

				if (modifyKeyPressed) {
					this.handleModifyKeyDown(event)
				} else {
					if (this.handleRemoveRange()) {
						event.preventDefault()
					}

					if (event.keyCode === spaceKey) {
						if (!this.spacesDown) {
							this.spacesDown = true
							this.syncContainer(selection.anchorContainer)
							timeTravel.commit()
							timeTravel.preservePreviousSelection()
						}
					} else if (this.removedRange && event.key.toLowerCase() !== 'tab') {
						this.insertText(event.key)
						timeTravel.dropCommit()
					}

					this.scheduleUpdate(selection.anchorContainer)
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
		const { selection, timeTravel } = this.core

		switch (event.keyCode) {
			case backspaceKey:
				if (selection.anchorContainer.isContainer) {
					selection.selectionChange()
				}

				if (
					!selection.isRange &&
					selection.anchorAtFirstPositionInContainer
				) {
					this.update()
					timeTravel.preservePreviousSelection()
				}

				this.handleBackspaceKeyDown(event)
				break
			case deletekey:
				if (
					!selection.isRange &&
					selection.focusAtLastPositionInContainer
				) {
					this.update()
					timeTravel.preservePreviousSelection()
				}

				this.handleDeleteKeyDown(event)
				break
			case enterKey:
				if (!selection.isRange) {
					this.update()
					timeTravel.preservePreviousSelection()
				}

				this.handleEnterKeyDown(event)
				break
			case rightKey:
				if (!selection.isRange && selection.focusAtLastPositionInContainer && selection.anchorContainer.last.isInlineWidget) {
					this.hanldeRightKeyDown(event)
				}

				break
		}

		this.core.builder.commit()
	}

	handleRemoveRange() {
		if (!this.core.selection.isRange) {
			this.removedRange = false

			return
		}

		const { anchorContainer, anchorOffset, focusContainer, focusOffset} = this.core.selection
		const { head, tail } = this.core.builder.cutRange(anchorContainer, anchorOffset, focusContainer, focusOffset)
		const sameContainer = anchorContainer === focusContainer
		const previousSelectableNode = head.getPreviousSelectableNode()
		const nextSelectableNode = tail.getNextSelectableNode()

		this.removedRange = true
		this.core.builder.cutUntil(head, tail)

		if (!sameContainer && previousSelectableNode && nextSelectableNode) {
			this.core.builder.combine(previousSelectableNode, nextSelectableNode)
		} else {
			this.core.selection.setSelection(anchorContainer, anchorOffset)
		}

		return {
			head,
			tail
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

	hanldeRightKeyDown(event) {
		event.preventDefault()

		const { builder, selection } = this.core
		const text = builder.create('text', { content: nbsp })

		builder.append(selection.anchorContainer, text)
		selection.setSelection(selection.anchorContainer, selection.anchorOffset + 1)
	}

	getModifyKeyHandlerParams() {
		this.modifyKeyHandlerParams.anchorOffset = this.core.selection.anchorOffset
		this.modifyKeyHandlerParams.focusOffset = this.core.selection.focusOffset
		this.modifyKeyHandlerParams.anchorAtFirstPositionInContainer = this.core.selection.anchorAtFirstPositionInContainer
		this.modifyKeyHandlerParams.anchorAtLastPositionInContainer = this.core.selection.anchorAtLastPositionInContainer
		this.modifyKeyHandlerParams.focusAtFirstPositionInContainer = this.core.selection.focusAtFirstPositionInContainer
		this.modifyKeyHandlerParams.focusAtLastPositionInContainer = this.core.selection.focusAtLastPositionInContainer
		this.modifyKeyHandlerParams.anchorContainer = this.core.selection.anchorContainer
		this.modifyKeyHandlerParams.focusContainer = this.core.selection.focusContainer
		this.modifyKeyHandlerParams.focused = this.core.selection.focused
		this.modifyKeyHandlerParams.focusedNodes = this.core.selection.focusedNodes
		this.modifyKeyHandlerParams.isRange = this.core.selection.isRange

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
				this.syncContainer(container)
			}
		}

		this.core.builder.commit()
		this.core.selection.selectionChange()
		this.isUpdating = false
	}

	syncContainer(container) {
		const { builder, parser } = this.core
		const replacement = builder.parseVirtualTree(parser.getVirtualTree(container.element.firstChild)).first

		builder.cutUntil(container.first)
		builder.append(container, replacement || builder.create('text', { content: '' }))
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
			const { head } = this.handleRemoveRange()
			const clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData

			this.core.builder.append(section, head)
			this.core.builder.commit()
			this.copyToClipboard(clipboardData, section)
		}

		event.preventDefault()
	}

	onCopy(event) {
		const clipboardData = event.clipboardData || window.clipboardData || event.originalEvent.clipboardData
		const { builder, selection } = this.core
		const section = new Section('root')

		if (selection.isRange) {
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

		if (selection.anchorContainer.isWidget) {
			const payload = builder.getJson(selection.anchorContainer, selection.anchorContainer)

			builder.append(section, builder.parseJson(payload))
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
				.replace(/&nbsp;/ig, ' ')
				.replace(/<[^>]+>/ig, '') + '\n'

			current = current.next
		}

		clipboardData.setData('text/html', '<meta charset="utf-8">' + htmlValue)
		clipboardData.setData('text/plain', textValue)
	}

	onPaste(event) {
		const doc = document.createElement('div')
		const { builder } = this.core
		const clipboardData = event.clipboardData || window.clipboardData

		event.preventDefault()

		if (clipboardData.types.includes('Files')) {
			return this.handleFiles(Array.prototype.slice.call(clipboardData.files))
		}

		let paste = clipboardData.getData('text/html')

		if (!paste.length) {
			paste = clipboardData.getData('text')
		}

		console.log(paste)

		doc.innerHTML = paste

		const result = builder.parseVirtualTree(this.core.parser.getVirtualTree(doc.firstChild))

		this.core.timeTravel.preservePreviousSelection()
		this.handleRemoveRange()
		this.update()
		builder.insert(result)
		builder.commit()
		this.core.autocomplete.runAll()
	}

	insertText(content) {
		const { selection, builder } = this.core
		const node = builder.getNodeByOffset(selection.anchorContainer, selection.anchorOffset)
		const { tail } = builder.splitByOffset(node.parent, selection.anchorOffset - builder.getOffsetToParent(selection.anchorContainer, node.parent))
		let attributes = {}

		if (node && node.type === 'text') {
			attributes = { ...node.attributes }
		}

		builder.append(node.parent, builder.create('text', { ...attributes, content }), tail)
		builder.commit()
		selection.setSelection(selection.anchorContainer, selection.anchorOffset + content.length)
	}

	async handleFiles(files) {
		const current = await this.core.builder.parseFiles(files)

		if (current) {
			this.core.builder.insert(current)
			this.core.builder.commit()
			this.core.selection.setSelection(current)
		}
	}

	catchShortcut(shortcutMatcher, shortcuts) {
		let shortcut

		for (shortcut in shortcuts) {
			if (shortcutMatcher(shortcut)) {
				return shortcuts[shortcut]
			}
		}

		return null
	}

	destroy() {
		this.node.removeEventListener('mousedown', this.onMouseDown)
		this.node.removeEventListener('keydown', this.onKeyDown)
		this.node.removeEventListener('keyup', this.onKeyUp)
		this.node.removeEventListener('input', this.onInput)
		this.node.removeEventListener('cut', this.onCut)
		this.node.removeEventListener('copy', this.onCopy)
		this.node.removeEventListener('paste', this.onPaste)
		this.node.removeEventListener('compositionstart', this.onCompositionStart)
		this.node.removeEventListener('compositionend', this.onCompositionEnd)
		clearTimeout(this.scheduleTimer)
		clearTimeout(this.keydownTimer)
	}
}
