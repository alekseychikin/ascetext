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
const modifyKeyCodes = [ enterKey, backspaceKey, deletekey ]
const metaKeyCodes = [ leftKey, upKey, rightKey, downKey, shiftKey, ctrlKey, optionKey, apple ]

class Editing {
	handleRemoveRange() {
		const selection = this.core.selection
		let item

		while (item = selection.selectedItems.pop()) {
			if (item === selection.focusContainer && selection.focusContainer.first) {
				selection.selectedItems[0].preconnect(selection.focusContainer.first)
			}

			if (
				item.type === 'text' ||
				item.isInlineWidget ||
				item.isContainer && item.parent.isSection ||
				item.isWidget && item.parent.isSection
			) {
				item.delete()
			}
		}

		if (!selection.anchorContainer.first) {
			selection.anchorContainer.append(new BreakLine())
		}

		selection.setSelection(selection.anchorContainer.element, selection.anchorOffset)
	}

	updateContainer(container) {
		if (container.isContainer && container.isChanged && !container.isDeleted) {
			const anchorOffset = this.core.selection.anchorOffset
			const focusOffset = this.core.selection.focusOffset
			const anchorContainer = this.core.selection.anchorContainer
			const focusContainer = this.core.selection.focusContainer
			const content = this.core.parse(container.firstChild, container.lastChild, {
				parsingContainer: true
			})

			container.clearChildren(container.first)

			if (content) {
				container.append(content)
			}

			container.isChanged = false

			console.log('updateContainer')
			if (this.core.selection.focused) {
				if (this.core.selection.isRange) {
					this.core.selection.setSelection(
						anchorContainer.element,
						anchorOffset,
						focusContainer.element,
						focusOffset
					)
				} else {
					this.core.selection.setSelection(anchorContainer.element, anchorOffset)
				}
			}
		}
	}

	handleBackspace(event) {
		if (this.core.selection.anchorContainer.backspaceHandler) {
			this.core.selection.anchorContainer.backspaceHandler(event, this.core)
		} else {
			event.preventDefault()
			console.warn('must be backspaceHandler on ', this.previousContainer)
		}
	}

	handleBackspaceKeyDown(event) {
		if (this.core.selection.isRange) {
			event.preventDefault()
			this.handleRemoveRange()
		} else {
			this.handleBackspace(event)
		}
	}

	handleDelete(event) {
		if (this.previousContainer.deleteHandler) {
			this.previousContainer.deleteHandler(event, this.core)
		} else {
			event.preventDefault()
			console.warn('must be deleteHandler on ', this.previousContainer)
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

	handleEnterKeyDownRange(event) {
		event.preventDefault()
		this.handleRemoveRange()

		if (this.core.selection.anchorContainer && this.core.selection.anchorContainer.enterHandler) {
			this.core.selection.anchorContainer.enterHandler(event, this.core)
		}
	}

	handleEnterKeyDownSingle(event) {
		event.preventDefault()

		if (this.previousContainer.enterHandler) {
			this.previousContainer.enterHandler(event, this.core)
		} else {
			console.info('must be enterHandler on ', this.previousContainer)
			event.preventDefault()
		}
	}

	handleEnterKeyDown(event) {
		if (this.core.selection.isRange) {
			this.handleEnterKeyDownRange(event)
		} else {
			this.handleEnterKeyDownSingle(event)
		}
	}

	handleModifyKeyDown(event) {
		const container = this.core.selection.anchorContainer

		switch (event.keyCode) {
			case backspaceKey:
				if (
					container.isChanged &&
					!this.core.selection.isRange && (
						this.core.selection.anchorAtFirstPositionInContainer ||
						this.core.selection.anchorAtLastPositionInContainer
					)
				) {
					this.updateContainer(container)
				}

				this.handleBackspaceKeyDown(event)
				this.core.updateSelection()
				break
			case deletekey:
				if (
					container.isChanged &&
					!this.core.selection.isRange && (
						this.core.selection.focusAtFirstPositionInContainer ||
						this.core.selection.focusAtLastPositionInContainer
					)
				) {
					this.updateContainer(container)
				}

				this.handleDeleteKeyDown(event)
				this.core.updateSelection()
				break
			case enterKey:
				if (
					container.isChanged &&
					!this.core.selection.isRange
				) {
					this.updateContainer(container)
				}

				this.handleEnterKeyDown(event)
				break
		}

		container.isChanged = true
		this.core.onUpdate()
	}

	onKeyDown(event) {
		if (
			!metaKeyCodes.includes(event.keyCode) &&
			!this.core.selection.focusedControl &&
			!event.metaKey && !event.altKey
		) {
			if (modifyKeyCodes.includes(event.keyCode)) {
				this.handleModifyKeyDown(event)
			} else {
				if (this.core.selection.isRange) {
					this.handleRemoveRange()
				}

				this.core.selection.anchorContainer.isChanged = true
			}
		}
	}

	onSelectionChange() {
		if (this.core.selection.focused) {
			const container = this.core.selection.anchorContainer

			if (!this.core.selection.isRange && container !== this.previousContainer) {
				if (this.previousContainer) {
					this.updateContainer(this.previousContainer)
				}

				this.previousContainer = container
			}
		} else {
			if (this.previousContainer) {
				this.updateContainer(this.previousContainer)

				this.previousContainer = null
			}
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
				const container = new Paragraph()

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
				anchorContainer.replaceWith(result, anchorContainer.next)
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
		if (this.previousContainer) {
			this.updateContainer(this.previousContainer)
			this.previousContainer = null
		}
	}

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
		this.onSelectionChange = this.onSelectionChange.bind(this)
		this.wrapWithContainer = this.wrapWithContainer.bind(this)
		this.onPaste = this.onPaste.bind(this)

		this.node = core.node
		this.core = core
		this.previousContainer = null

		this.node.addEventListener('paste', this.onPaste)
	}
}

module.exports = Editing
