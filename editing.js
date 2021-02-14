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
const spaceKey = 32
const modifyKeyCodes = [ enterKey, backspaceKey, deletekey ]
const metaKeyCodes = [ leftKey, upKey, rightKey, downKey, shiftKey, ctrlKey, optionKey, apple, esc ]

class Editing {
	constructor(core) {
		this.handleRemoveRange = this.handleRemoveRange.bind(this)
		this.updateContainer = this.updateContainer.bind(this)
		this.handleBackspace = this.handleBackspace.bind(this)
		this.handleBackspaceKeyDown = this.handleBackspaceKeyDown.bind(this)
		this.handleDelete = this.handleDelete.bind(this)
		this.handleDeleteKeyDown = this.handleDeleteKeyDown.bind(this)
		this.handleEnterKeyDownRange = this.handleEnterKeyDownRange.bind(this)
		this.handleEnterKeyDownSingle = this.handleEnterKeyDownSingle.bind(this)
		this.handleEnterKeyDown = this.handleEnterKeyDown.bind(this)
		this.handleModifyKeyDown = this.handleModifyKeyDown.bind(this)
		this.onKeyDown = this.onKeyDown.bind(this)
		this.wrapWithContainer = this.wrapWithContainer.bind(this)
		this.onPaste = this.onPaste.bind(this)
		this.saveChanges = this.saveChanges.bind(this)

		this.node = core.node
		this.core = core
		this.updateTimer = null

		this.node.addEventListener('paste', this.onPaste)
		document.addEventListener('keydown', this.onKeyDown)
	}

	updateContainer() {
		const container = this.core.selection.anchorContainer

		let content = this.core.parse(container.firstChild, container.lastChild, {
			parsingContainer: true
		})

		if (container.first) {
			this.handleTextInRemoveNodes(container.first)
			container.first.cutUntil()
		}

		while (container.element.firstChild !== null) {
			container.element.removeChild(container.element.firstChild)
		}

		if (content) {
			if (container.first) {
				container.first.replaceUntil(content)
			} else {
				container.append(content)
			}
		}

		container.isChanged = false

		if (this.core.selection.focused) {
			this.core.selection.restoreSelection(false)
		}
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

	scheduleUpdate() {
		if (this.updateTimer !== null) {
			clearTimeout(this.updateTimer)
			this.updateTimer = null
		}

		this.updateTimer = setTimeout(this.saveChanges, 500)
	}

	onKeyDown(event) {
		if (
			this.core.selection.focused
		) {
			if (event.keyCode === zKey && event.metaKey) {
				event.preventDefault()

				if (event.shiftKey) {
					this.core.timeTravel.goForward()
				} else {
					this.core.timeTravel.goBack()
				}
			} else if (
				!metaKeyCodes.includes(event.keyCode) &&
				!event.metaKey && !event.altKey
			) {
				this.core.timeTravel.preservePreviousSelection()

				if (modifyKeyCodes.includes(event.keyCode)) {
					this.handleModifyKeyDown(event)
				} else {
					if (this.core.selection.isRange) {
						this.handleRemoveRange()
					}

					this.core.selection.anchorContainer.isChanged = true

					if (event.keyCode === spaceKey) {
						this.saveChanges()
					} else {
						this.scheduleUpdate()
					}
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
					this.saveChanges()
				}

				this.handleBackspaceKeyDown(event)
				break
			case deletekey:
				if (
					!this.core.selection.isRange &&
					this.core.selection.focusAtLastPositionInContainer
				) {
					this.saveChanges()
				}

				this.handleDeleteKeyDown(event)
				break
			case enterKey:
				if (!this.core.selection.isRange) {
					this.saveChanges()
				}

				this.handleEnterKeyDown(event)
				break
		}

		this.core.onUpdate()
	}

	handleRemoveRange() {
		const selectedItems = this.core.selection.getSelectedItems()
		const filteredSelectedItems = selectedItems.filter((item) =>
			item.isContainer || item.parent.isContainer
		)
		const selectedWidgets = selectedItems.filter((item) => item.isWidget)
		const selectedContainers = selectedItems.filter((item) => item.isContainer)
		const lastSelectedContainer = selectedContainers[selectedContainers.length - 1]
		let lastItem
		let previousSelectableNode = selectedItems[0].getPreviousSelectableNode()
		let offset = previousSelectableNode ? previousSelectableNode.getOffset() : 0
		let lastItemNextNode

		selectedWidgets.forEach((item) => {
			item.cut()
			selectedItems.splice(selectedItems.indexOf(item), 1)
		})
		selectedContainers.forEach((item, index) => {
			if (index < selectedContainers.length - 1) {
				item.cut()
			}
		})

		lastItem = selectedItems[selectedItems.length - 1]

		if (!selectedItems[0].isContainer) {
			previousSelectableNode = selectedItems[0].getClosestContainer()
			offset = previousSelectableNode.getOffset(selectedItems[0].element)
			selectedItems[0].cutUntil(lastItem)
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
				previousSelectableNode.append(lastItemNextNode)
				lastSelectedContainer.cut()
			}
		}

		this.core.selection.setSelection(previousSelectableNode.element, offset)
		this.saveChanges()
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

			this.core.selection.anchorContainer.isChanged = true
			this.scheduleUpdate()
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

			this.core.selection.anchorContainer.isChanged = true
			this.scheduleUpdate()
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

	wrapWithContainer(node) {
		let current = node
		let next
		let result

		while (current) {
			next = current.next

			if (current.isContainer) {
				if (!result) {
					result = current
				}
			} else {
				const container = new Paragraph(this.core)

				current.preconnect(container)
				container.push(current)

				if (!result) {
					result = container
				}
			}

			current = next
		}

		return result
	}

	onPaste(event) {
		const paste = (event.clipboardData || window.clipboardData).getData('text/html')
		const doc = document.createElement('div')

		doc.innerHTML = paste

		const result = this.wrapWithContainer(this.core.parse(doc.firstChild, doc.lastChild))

		if (this.core.selection.isRange) {
		} else {
			const anchorContainer = this.core.selection.anchorContainer

			if (this.core.selection.anchorAtFirstPositionInContainer && this.core.selection.anchorAtLastPositionInContainer) {
				anchorContainer.replaceWith(result, anchorContainer)
				this.core.update(result, anchorContainer.next)
			} else if (this.core.selection.anchorAtFirstPositionInContainer) {
				anchorContainer.preconnect(result)
				this.core.update(result, anchorContainer)
				this.core.setPosition(anchorContainer.findFirstTextElement() || anchorContainer.element, 0)
			} else if (this.core.selection.anchorAtLastPositionInContainer) {
				const nextContainer = anchorContainer.getNextSelectableNode()

				anchorContainer.connect(result)
				this.core.update(result, nextContainer)
				this.core.setPosition(result.findFirstTextElement() || result.element, 0)
			} else {
				const [ selectedAnchorChild, anchorOffset ] = anchorContainer.getChildByOffset(this.core.selection.anchorOffset)

				if (selectedAnchorChild && selectedAnchorChild.nodeType === 3) {
					const selectedAnchorNode = getNodeByElement(selectedAnchorChild)
					let anchorTail = selectedAnchorNode.split(anchorOffset)
					let anchorParent = selectedAnchorNode.parent

					while (anchorParent !== anchorContainer) {
						anchorTail = anchorParent.split(anchorTail)
						anchorParent = anchorParent.parent
					}

					const tail = anchorContainer.split(anchorTail)

					this.core.update(anchorContainer, anchorContainer.next.next)
					this.core.setPosition(tail.findFirstTextElement() || tail.element, 0)

					anchorContainer.connect(result)
					this.core.update(result, tail)
					this.core.setPosition(result.findFirstTextElement() || result.element, 0)
				} else {
					console.error('enter under not text focus')
				}
			}
		}

		event.preventDefault()
	}

	saveChanges() {
		if (this.core.selection.anchorContainer.isChanged) {
			if (this.updateTimer !== null) {
				clearTimeout(this.updateTimer)
				this.updateTimer = null
			}

			this.updateContainer()
			this.core.timeTravel.commit()
		}
	}
}

module.exports = Editing
