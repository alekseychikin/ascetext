const getNodeByElement = require('../nodes/node').getNodeByElement

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
const apple = 91
const esc = 27
const zKey = 90
const spaceKey = 32
const modifyKeyCodes = [ enterKey, backspaceKey, deletekey ]
const metaKeyCodes = [ leftKey, upKey, rightKey, downKey, shiftKey, ctrlKey, optionKey, apple, esc ]

class Editing {
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
		this.onNodeTransform = this.onNodeTransform.bind(this)
		this.onKeyDown = this.onKeyDown.bind(this)
		this.onPaste = this.onPaste.bind(this)
		this.onCut = this.onCut.bind(this)

		this.node = core.node
		this.core = core
		this.updateTimer = null
		this.modifyKeyHandlerParams = {}

		this.node.addEventListener('paste', this.onPaste)
		this.node.addEventListener('keydown', this.onKeyDown)
		this.node.addEventListener('cut', this.onCut)
		this.node.addEventListener('node-change', this.onNodeTransform)
	}

	onKeyDown(event) {
		if (this.core.selection.focused) {
			const undoRepeat = event.keyCode === zKey && event.metaKey
			const singleKeyPessed = !metaKeyCodes.includes(event.keyCode) && !event.metaKey && !event.altKey
			const modifyKeyPressed = modifyKeyCodes.includes(event.keyCode)

			if (undoRepeat) {
				event.preventDefault()

				if (event.shiftKey) {
					this.core.timeTravel.goForward()
				} else {
					this.core.timeTravel.goBack()
				}
			} else if (singleKeyPessed || modifyKeyPressed) {
				this.core.timeTravel.preservePreviousSelection()

				if (modifyKeyPressed) {
					this.handleModifyKeyDown(event)
				} else {
					if (this.core.selection.isRange) {
						this.handleRemoveRange()
					}

					if (event.keyCode === spaceKey) {
						this.core.selection.anchorContainer.update(this.getModifyKeyHandlerParams())
						this.core.timeTravel.commit()
						this.core.timeTravel.preservePreviousSelection()
					}

					this.core.selection.anchorContainer.markDirty(this.getModifyKeyHandlerParams())
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
					this.core.selection.anchorContainer.update(this.getModifyKeyHandlerParams())
				}

				this.handleBackspaceKeyDown(event)
				break
			case deletekey:
				if (
					!this.core.selection.isRange &&
					this.core.selection.focusAtLastPositionInContainer
				) {
					// здесь нужно делать синхронизацию, а не апдейт
					this.core.selection.anchorContainer.update(this.getModifyKeyHandlerParams())
				}

				this.handleDeleteKeyDown(event)
				break
			case enterKey:
				// debugger
				if (!this.core.selection.isRange) {
					// здесь нужно делать синхронизацию, а не апдейт
					this.core.selection.anchorContainer.update(this.getModifyKeyHandlerParams())
				}

				this.handleEnterKeyDown(event)
				break
		}
	}

	handleRemoveRange() {
		const selectedItems = this.core.selection.getSelectedItems()
		const containersForRemove = []
		let index
		let duplicate
		let firstContainer
		let returnHtmlValue = ''
		let returnTextValue = ''

		if (!selectedItems.length) {
			return ''
		}

		if (!selectedItems[0].isContainer && !selectedItems[0].isWidget) {
			const { since, until } = this.captureSinceAndUntil(selectedItems, 0)

			firstContainer = selectedItems[0].getClosestContainer()
			duplicate = firstContainer.duplicate()

			since.cutUntil(until)
			duplicate.append(since)
			containersForRemove.push(duplicate)
		} else {
			containersForRemove.push(selectedItems[0])
		}

		selectedItems.forEach((item) => {
			if (item.isContainer || item.isWidget) {
				containersForRemove.push(item)
			}
		})

		let lastContainer = containersForRemove[containersForRemove.length - 1]

		if (containersForRemove.length > 1 && lastContainer.isContainer) {
			index = selectedItems.indexOf(lastContainer)

			if (index < selectedItems.length - 1) {
				const { until } = this.captureSinceAndUntil(selectedItems, index + 1)

				if (until.next) {
					const since = until.next

					if (firstContainer.isContainer) {
						firstContainer.append(since)
					} else {
						lastContainer = lastContainer.duplicate()

						lastContainer.append(since)
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

		containersForRemove[0].cutUntil(containersForRemove[containersForRemove.length - 1])

		if (firstContainer.isContainer) {
			this.core.selection.setSelection(
				firstContainer,
				this.core.selection.isForwardDirection
					? this.core.selection.anchorIndex[this.core.selection.anchorIndex.length - 1]
					: this.core.selection.focusIndex[this.core.selection.focusIndex.length - 1]
			)
		} else if (lastContainer.isContainer) {
			this.core.selection.setSelection(lastContainer, 0)
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
			if (items[index].isWidget || items[index].isContainer) {
				break
			}

			if (items[index].parent && (
				items[index].parent.isWidget || items[index].parent.isContainer
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

			if (!event.defaultPrevented) {
				this.core.selection.anchorContainer.markDirty(this.getModifyKeyHandlerParams())
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

			if (!event.defaultPrevented) {
				this.core.selection.anchorContainer.markDirty(this.getModifyKeyHandlerParams())
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
		} else {
			console.info('must be enterHandler on ', this.core.selection.anchorContainer)
			event.preventDefault()
		}
	}

	getModifyKeyHandlerParams() {
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
		this.modifyKeyHandlerParams.parse = this.core.parse
		this.modifyKeyHandlerParams.isLockPushChange = this.core.timeTravel.isLockPushChange

		return this.modifyKeyHandlerParams
	}

	onNodeTransform(event) {
		const container = getNodeByElement(event.target).getClosestContainer()

		if (container) {
			container.transform(this.getModifyKeyHandlerParams())
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

		doc.innerHTML = paste

		const result = this.core.parse(doc.firstChild, doc.lastChild)

		if (this.core.selection.isRange) {
			this.handleRemoveRange()
		}

		if (result.isContainer) {
			if (result.next) {
				const { head, tail } = this.core.selection.anchorContainer.split(
					this.core.selection.anchorOffset
				)
				const lastNode = result.getLastNode()
				const closestContainerInSection = this.getClosestContainerInSection(head)

				head.append(result.first)
				closestContainerInSection.connect(result)
				result.cut()
				lastNode.append(tail.first)
				tail.cut()
			} else {
				const firstLevelNode = this.core.selection.anchorContainer.getFirstLevelNode(
					this.core.selection.anchorOffset
				)
				const { head } = firstLevelNode.split(
					this.core.selection.anchorOffset - this.core.selection.anchorContainer.getOffset(
						firstLevelNode.element
					)
				)

				head.connect(result.first)
			}
		} else if (result.isWidget) {
			const { head } = this.core.selection.anchorContainer.split(
				this.core.selection.anchorOffset
			)

			head.connect(result)
		} else {
		}

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

	destroy() {
		this.node.removeEventListener('paste', this.onPaste)
		this.node.removeEventListener('keydown', this.onKeyDown)
		this.node.removeEventListener('cut', this.onCut)
		this.node.removeEventListener('node-change', this.onNodeTransform)
	}
}

module.exports = Editing
