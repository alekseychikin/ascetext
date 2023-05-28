import isFunction from '../utils/is-function.js'
import nbsp from '../utils/nbsp.js'
import createShortcutMatcher from '../utils/create-shortcut-matcher.js'

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
		this.onInput = this.onInput.bind(this)
		this.onPaste = this.onPaste.bind(this)
		this.onCut = this.onCut.bind(this)

		this.node = core.node
		this.core = core
		this.updatingContainers = []
		this.modifyKeyHandlerParams = {}
		this.markDirtyTimer = null

		this.node.addEventListener('paste', this.onPaste)
		this.node.addEventListener('keydown', this.onKeyDown)
		this.node.addEventListener('input', this.onInput)
		this.node.addEventListener('cut', this.onCut)
	}

	onKeyDown(event) {
		const { selection, timeTravel, toolbar } = this.core
		const shortrcutMatcher = createShortcutMatcher(event)
		let shortcutHandler

		if (selection.focused) {
			const undoRepeat = event.keyCode === zKey && (isMac && event.metaKey || !isMac && event.ctrlKey)
			const singleKeyPessed = !metaKeyCodes.includes(event.keyCode) && !event.metaKey && !event.altKey && !event.ctrlKey
			const modifyKeyPressed = modifyKeyCodes.includes(event.keyCode)

			if (undoRepeat) {
				event.preventDefault()

				if (event.shiftKey) {
					timeTravel.goForward()
				} else {
					timeTravel.goBack()
				}
			} else if (!selection.isRange && (shortcutHandler = this.catchShortcut(shortrcutMatcher, selection.anchorContainer.shortcuts))) {
				shortcutHandler(event, this.getModifyKeyHandlerParams())
			} else if (shortcutHandler = this.catchShortcut(shortrcutMatcher, toolbar.getShortcuts())) {
				toolbar.controlHandler(shortcutHandler, event)
				event.preventDefault()
			} else if (forbiddenShortcuts.find((item) => shortrcutMatcher(item))) {
				event.preventDefault()
			} else if (singleKeyPessed || modifyKeyPressed) {
				timeTravel.preservePreviousSelection()

				if (modifyKeyPressed) {
					this.handleModifyKeyDown(event)
				} else {
					this.handleRemoveRange()

					if (event.keyCode === spaceKey) {
						// здесь нужно делать синхронизацию, а не апдейт
						// потому что апдейт — это замена содержимого, а в этом случае нужно
						// синхронизировать модель данных
						// нужно спарсить без нормализации и без обновления реальных нод
						this.update()
						timeTravel.commit()
						timeTravel.preservePreviousSelection()

						const { node, element } = selection.anchorContainer.getChildByOffset(selection.anchorOffset)
						const offset = selection.anchorOffset - selection.anchorContainer.getOffset(element)
						const content = node.content.substr(0, offset) + (!offset || offset === node.content.length ? nbsp : ' ') + node.content.substr(offset)

						node.content = content
						element.nodeValue = content
						selection.setSelection(selection.anchorContainer, selection.anchorOffset + 1)
						event.preventDefault()
					}

					// console.log('markDirty', selection.anchorOffset)
					this.markDirty(selection.anchorContainer)
				}
			}
		}
	}

	handleModifyKeyDown(event) {
		switch (event.keyCode) {
			case backspaceKey:
				if (
					!this.core.selection.isRange &&
					this.core.selection.anchorAtFirstPositionInContainer
				) {
					// здесь нужно делать синхронизацию, а не апдейт
					// потому что апдейт — это замена содержимого, а в этом случае нужно
					// синхронизировать модель данных
					// нужно спарсить без нормализации и без обновления реальных нод
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
					// здесь нужно делать синхронизацию, а не апдейт
					this.update()
					this.core.timeTravel.preservePreviousSelection()
				}

				this.handleDeleteKeyDown(event)
				break
			case enterKey:
				// debugger
				if (!this.core.selection.isRange) {
					// здесь нужно делать синхронизацию, а не апдейт
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
			this.markDirty(firstContainer)
			this.core.selection.setSelection(
				firstContainer,
				this.core.selection.anchorIndex[this.core.selection.anchorIndex.length - 1]
			)
		} else {
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
		if (this.core.selection.anchorContainer.backspaceHandler) {
			this.core.selection.anchorContainer.backspaceHandler(
				event,
				this.getModifyKeyHandlerParams()
			)

			if (event.defaultPrevented) {
				this.update()
			} else {
				this.markDirty(this.core.selection.anchorContainer)
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
		if (this.core.selection.anchorContainer.deleteHandler) {
			this.core.selection.anchorContainer.deleteHandler(
				event,
				this.getModifyKeyHandlerParams()
			)

			if (event.defaultPrevented) {
				this.update()
			} else {
				this.markDirty(this.core.selection.anchorContainer)
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

		if (this.core.selection.anchorContainer && this.core.selection.anchorContainer.enterHandler) {
			this.core.selection.anchorContainer.enterHandler(
				event,
				this.getModifyKeyHandlerParams()
			)
		}
	}

	handleEnterKeyDownSingle(event) {
		event.preventDefault()

		if (this.core.selection.anchorContainer.enterHandler) {
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

	onInput(event) {
		if (this.core.selection.anchorContainer && this.core.selection.anchorContainer.inputHandler) {
			this.core.selection.anchorContainer.inputHandler(
				event,
				this.getModifyKeyHandlerParams()
			)
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
		this.modifyKeyHandlerParams.isLockPushChange = this.core.timeTravel.isLockPushChange

		return this.modifyKeyHandlerParams
	}

	markDirty(container) {
		this.isChanged = true

		if (this.core.timeTravel.isLockPushChange) {
			return
		}

		if (this.markDirtyTimer !== null) {
			clearTimeout(this.markDirtyTimer)
		}

		if (this.updatingContainers.indexOf(container) === -1) {
			this.updatingContainers.push(container)
		}

		this.markDirtyTimer = setTimeout(this.update, 350)
	}

	update() {
		clearTimeout(this.markDirtyTimer)
		this.markDirtyTimer = null

		let container
		let normalized

		while (container = this.updatingContainers.pop()) {
			if (container.isContainer) {
				const content = this.core.builder.parse(container.element)

				if (container.first) {
					this.handleTextInRemoveNodes(container.first)
					this.core.builder.cutUntil(container.first)
				}

				while (container.element.firstChild !== null) {
					container.element.removeChild(container.element.firstChild)
				}

				this.core.builder.append(container, content.first || this.core.builder.create('breakLine'))
			}

			if (container.previous && isFunction(container.previous.normalize)) {
				if (normalized = container.previous.normalize(container, this.core.builder)) {
					this.core.builder.replaceUntil(container.previous, normalized, container)
				}
			}

			// console.log('container update', container.element)
		}

		if (this.core.selection.focused) {
			this.core.selection.restoreSelection(false)
		}

		this.core.timeTravel.commit()
	}

	handleTextInRemoveNodes(node) {
		let current = node

		while (current) {
			if (current.type === 'text') {
				if (current.content !== current.element.nodeValue) {
					current.element.nodeValue = current.content
				}
			} else if (current.first) {
				this.handleTextInRemoveNodes(current.first)
			}

			current = current.next
		}
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
