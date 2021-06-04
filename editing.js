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
					// здесь нужно делать синхронизацию, а не апдейт
					this.core.selection.anchorContainer.update()
				}

				this.handleBackspaceKeyDown(event)
				break
			case deletekey:
				if (
					!this.core.selection.isRange &&
					this.core.selection.focusAtLastPositionInContainer
				) {
					// здесь нужно делать синхронизацию, а не апдейт
					this.core.selection.anchorContainer.update()
				}

				this.handleDeleteKeyDown(event)
				break
			case enterKey:
				// debugger
				if (!this.core.selection.isRange) {
					// здесь нужно делать синхронизацию, а не апдейт
					this.core.selection.anchorContainer.update()
				}

				this.handleEnterKeyDown(event)
				break
		}

		this.core.onUpdate()
	}

	handleRemoveRange(isReturnString = false) {
		const selectedItems = this.core.selection.getSelectedItems()
		const containersForRemove = []
		let since
		let until
		let index
		let duplicate
		let firstContainer

		if (!selectedItems.length) {
			return ''
		}

		if (!selectedItems[0].isContainer && !selectedItems[0].isWidget) {
			firstContainer = selectedItems[0].getClosestContainer()
			duplicate = firstContainer.duplicate()
			index = 1
			since = selectedItems[0]
			until = since

			for (; index < selectedItems.length; index++) {
				if (selectedItems[index].isWidget || selectedItems[index].isContainer) {
					break
				}

				if (selectedItems[index].parent && (
					selectedItems[index].parent.isWidget || selectedItems[index].parent.isContainer
				)) {
					until = selectedItems[index]
				}
			}

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
				since = selectedItems[index + 1]
				until = since

				for (; index < selectedItems.length; index++) {
					if (selectedItems[index].parent && (
						selectedItems[index].parent.isWidget || selectedItems[index].parent.isContainer
					)) {
						until = selectedItems[index]
					}
				}

				if (until.next) {
					since = until.next

					if (firstContainer.isContainer) {
						firstContainer.append(since)
					} else {
						lastContainer = lastContainer.duplicate()

						lastContainer.append(since)
					}
				}

			}
		}

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
	}

	// не нравится
	stringifyRemovingRange(items) {
		let returnString = ''
		let lastContainer = null
		let children = ''

		items.forEach((item) => {
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
		let paste = (event.clipboardData || window.clipboardData).getData('text/html')

		if (!paste.length) {
			paste = (event.clipboardData || window.clipboardData).getData('text')
		}

		const doc = document.createElement('div')


		console.log(paste)
		// doc.innerHTML = paste

		// const result = this.core.parse(doc.firstChild, doc.lastChild)
		// console.log('paste', result)

		event.preventDefault()
	}
}

module.exports = Editing
