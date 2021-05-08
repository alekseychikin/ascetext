const Paragraph = require('./plugins/paragraph').Paragraph
const getNodeByElement = require('./nodes/node').getNodeByElement
const BreakLine = require('./plugins/break-line').BreakLine

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
const xKey = 88
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
		this.onKeyDown = this.onKeyDown.bind(this)
		this.onPaste = this.onPaste.bind(this)

		this.node = core.node
		this.core = core
		this.updateTimer = null

		this.node.addEventListener('paste', this.onPaste)
		document.addEventListener('keydown', this.onKeyDown)
	}

	onKeyDown(event) {
		if (this.core.selection.focused) {
			const undoRepeat = event.keyCode === zKey && event.metaKey
			const cut = event.keyCode === xKey && event.metaKey && this.core.selection.isRange
			const singleKeyPessed = !metaKeyCodes.includes(event.keyCode) && !event.metaKey && !event.altKey
			const modifyKeyPressed = modifyKeyCodes.includes(event.keyCode)

			if (undoRepeat) {
				event.preventDefault()

				if (event.shiftKey) {
					this.core.timeTravel.goForward()
				} else {
					this.core.timeTravel.goBack()
				}
			} else if (cut) {
				event.preventDefault()

				const string = this.handleRemoveRange(true)
				console.log(string)
			} else if (singleKeyPessed) {
				this.core.timeTravel.preservePreviousSelection()

				if (modifyKeyPressed) {
					this.handleModifyKeyDown(event)
				} else {
					if (this.core.selection.isRange) {
						this.handleRemoveRange()
					}

					if (event.keyCode === spaceKey) {
						this.core.selection.anchorContainer.update()
						this.core.timeTravel.commit()
						this.core.timeTravel.preservePreviousSelection()
					}

					this.core.selection.anchorContainer.markDirty()
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
					this.core.selection.anchorContainer.update()
				}

				this.handleBackspaceKeyDown(event)
				break
			case deletekey:
				if (
					!this.core.selection.isRange &&
					this.core.selection.focusAtLastPositionInContainer
				) {
					this.core.selection.anchorContainer.update()
				}

				this.handleDeleteKeyDown(event)
				break
			case enterKey:
				// debugger
				if (!this.core.selection.isRange) {
					this.core.selection.anchorContainer.update()
				}

				this.handleEnterKeyDown(event)
				break
		}

		this.core.onUpdate()
	}

	// не нравится
	handleRemoveRange(isReturnString = false) {
		const selectedItems = this.core.selection.getSelectedItems()
		const returnString =
			isReturnString ? this.stringifyRemovingRange(selectedItems) : ''
		const filteredSelectedItems = selectedItems.slice()
		const selectedWidgets = filteredSelectedItems.filter((item) => item.isWidget)
		const selectedContainers = filteredSelectedItems.filter((item) => item.isContainer)
		const lastSelectedContainer = selectedContainers[selectedContainers.length - 1]
		let lastItem
		let previousSelectableNode = filteredSelectedItems[0].getPreviousSelectableNode()
		let offset = previousSelectableNode ? previousSelectableNode.getOffset() : 0
		let lastItemNextNode

		selectedWidgets.forEach((item) => {
			item.cut()
			filteredSelectedItems.splice(filteredSelectedItems.indexOf(item), 1)
		})
		selectedContainers.forEach((item, index) => {
			if (index < selectedContainers.length - 1) {
				item.cut()
			}
		})

		lastItem = filteredSelectedItems[filteredSelectedItems.length - 1]

		if (!filteredSelectedItems[0].isContainer) {
			previousSelectableNode = filteredSelectedItems[0].getClosestContainer()
			offset = previousSelectableNode.getOffset(filteredSelectedItems[0].element)
			filteredSelectedItems[0].cutUntil(lastItem)
		}

		if (selectedContainers.length > 0 && lastItem) {
			lastItemNextNode = lastItem.next
			previousSelectableNode = lastItem.getPreviousSelectableNode()

			if (!lastItem.isContainer) {
				lastSelectedContainer.first.cutUntil(lastItem)
			}

			if (lastItem === lastSelectedContainer) {
				lastItemNextNode = lastSelectedContainer.first
			}

			if (
				previousSelectableNode &&
				previousSelectableNode.isContainer
			) {
				if (lastItemNextNode) {
					previousSelectableNode.append(lastItemNextNode)
				}

				lastSelectedContainer.cut()
			}
		}

		this.core.selection.setSelection(previousSelectableNode, offset)
		// this.core.selection.anchorContainer.update()

		if (isReturnString) {
			return returnString
		}
	}

	// не нравится
	stringifyRemovingRange(items) {
		let returnString = ''
		let lastContainer = null
		let children = ''

		items.forEach((item, index) => {
			if (item.isContainer || item.isWidget) {
				if (lastContainer !== null) {
					returnString += item.stringify(children)
					children = ''
				}

				lastContainer = item
			}

			if (item.parent.isContainer || item.parent.isWidget) {
				if (lastContainer === null) {
					returnString += item.stringify(this.core.stringify(item.first))
				} else {
					children += item.stringify(this.core.stringify(item.first))
				}
			}
		})

		return returnString + (lastContainer !== null ? lastContainer.stringify(children) : '')
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
			this.core.selection.anchorContainer.backspaceHandler(event)

			if (!event.defaultPrevented) {
				this.core.selection.anchorContainer.markDirty()
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
			this.core.selection.anchorContainer.deleteHandler(event)

			if (!event.defaultPrevented) {
				this.core.selection.anchorContainer.markDirty()
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
			this.core.selection.anchorContainer.enterHandler(event)
		}
	}

	handleEnterKeyDownSingle(event) {
		event.preventDefault()

		if (this.core.selection.anchorContainer.enterHandler) {
			this.core.selection.anchorContainer.enterHandler(event)
		} else {
			console.info('must be enterHandler on ', this.core.selection.anchorContainer)
			event.preventDefault()
		}
	}

	// не работает
	onPaste(event) {
		const paste = (event.clipboardData || window.clipboardData).getData('text/html')
		const doc = document.createElement('div')

		doc.innerHTML = paste

		const result = this.core.parse(doc.firstChild, doc.lastChild)
		console.log('paste', result)

		event.preventDefault()
	}
}

module.exports = Editing
