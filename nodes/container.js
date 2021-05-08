const Node = require('./node')
const getNodeByElement = require('./node').getNodeByElement
const paragraphPackage = require('../plugins/paragraph')
const BreakLine = require('../plugins/break-line').BreakLine
const Toolbar = require('../toolbar')

class Container extends Node {
	constructor(core, type) {
		super(core, type)

		this.toggleControls = this.toggleControls.bind(this)
		this.hideToolbar = this.hideToolbar.bind(this)
		this.showToolbar = this.showToolbar.bind(this)
		this.controlHandler = this.controlHandler.bind(this)
		this.onMouseDown = this.onMouseDown.bind(this)

		this.isContainer = true
		this.isChanged = false
		this.isShowToolbar = false
		this.isShowControls = false
		this.createControls()
	}

	setElement(element) {
		this.element = element
	}

	onMouseDown() {
		this.selection.focusedControl = true
	}

	enterHandler(event) {
		if (event.shiftKey) {
			event.preventDefault()

			const childByOffset = this.getChildByOffset(this.core.selection.anchorOffset)
			const childOffset = this.getOffset(childByOffset)
			const restOffset = this.core.selection.anchorOffset - childOffset
			const childNode = getNodeByElement(childByOffset)
			const { head, tail } = childNode.split(restOffset)

			if (head !== null) {
				head.connect(new BreakLine(this.core))
			} else {
				tail.preconnect(new BreakLine(this.core))
			}

			if (this.core.selection.anchorAtLastPositionInContainer && childNode.type !== 'breakLine') {
				childNode.connect(new BreakLine(this.core))
			}

			this.core.selection.setSelection(
				this.core.selection.anchorContainer,
				this.core.selection.anchorOffset + 1
			)
			this.core.selection.update()
		} else {
			if (!this.parent.isSection && !this.parent.isGroup) {
				return false
			}

			event.preventDefault()

			if (this.core.selection.focusAtLastPositionInContainer) {
				const emptyParagraph = new paragraphPackage.Paragraph(this.core)

				this.connect(emptyParagraph)

				this.core.selection.setSelection(emptyParagraph, 0)
			} else if (this.core.selection.anchorAtFirstPositionInContainer) {
				const emptyParagraph = new paragraphPackage.Paragraph(this.core)

				this.preconnect(emptyParagraph)

				this.core.selection.setSelection(this, 0)
			} else {
				const { tail } = this.split(this.core.selection.anchorOffset)

				if (tail !== null) {
					this.core.selection.setSelection(tail, 0)
				}
			}
		}
	}

	// handlePreviousForNormalizeOpportunity(element) {
	// 	let normalized

	// 	if (
	// 		element.next && element.type === element.next.type && element.normalize &&
	// 		(normalized = element.normalize(element.next))
	// 	) {
	// 		element.replaceUntil(normalized, element.next)

	// 		return normalized
	// 	}
	// }

	backspaceHandler(event) {
		if (this.core.selection.anchorAtFirstPositionInContainer) {
			event.preventDefault()

			const container = this.core.selection.anchorContainer

			if (!container.parent.isSection && !container.parent.isGroup) {
				return false
			}

			const previousSelectableNode = container.getPreviousSelectableNode()

			if (!previousSelectableNode) {
				return false
			}

			if (this.core.selection.anchorAtLastPositionInContainer) {
				container.cut()

				if (previousSelectableNode.isContainer) {
					const offset = previousSelectableNode.getOffset()

					this.core.selection.setSelection(previousSelectableNode, offset)
				} else if (previousSelectableNode.isWidget) {
					this.core.selection.setSelection(previousSelectableNode, 0)
				}
			} else {
				if (previousSelectableNode.isContainer) {
					const offset = previousSelectableNode.getOffset()

					if (!offset) {
						previousSelectableNode.cut()
						this.core.selection.setSelection(container, 0)
					} else {
						if (container.first) {
							previousSelectableNode.isChanged = true
							previousSelectableNode.append(container.first)
						}

						container.cut()

						this.core.selection.setSelection(previousSelectableNode, offset)
					}
				} else if (previousSelectableNode.isWidget) {
					this.core.selection.setSelection(previousSelectableNode, 0)
				}
			}
		}
	}

	deleteHandler(event) {
		if (this.core.selection.anchorAtLastPositionInContainer) {
			event.preventDefault()

			const container = this.core.selection.anchorContainer

			if (!container.parent.isSection && !container.parent.isGroup) {
				return false
			}

			const nextSelectableNode = container.getNextSelectableNode()

			if (!nextSelectableNode) {
				return false
			}

			if (this.core.selection.anchorAtFirstPositionInContainer) {
				container.cut()

				if (nextSelectableNode.isContainer || nextSelectableNode.isWidget) {
					this.core.selection.setSelection(nextSelectableNode, 0)
				}
			} else {
				if (nextSelectableNode.isContainer) {
					const offset = container.getOffset()

					if (!nextSelectableNode.hasOnlyBr) {
						container.isChanged = true
						container.append(nextSelectableNode.first)
					}

					nextSelectableNode.cut()

					this.core.selection.setSelection(container, offset)
				} else if (nextSelectableNode.isWidget) {
					this.core.selection.setSelection(nextSelectableNode, 0)
				}
			}
		}
	}

	onFocus(selection) {
		// здесь выводить тултип для вставки виджетов
		// А так же действия, которые можно сделать с контейнерами,
		// вроде переключения между заголовками и параграфом
		// console.log('container focus', selection)
		this.selection = selection
		// this.showToolbar()
	}

	onBlur() {
		this.hideToolbar()
	}

	onDelete() {
		if (this.toolbar) {
			if (this.toolbar.parentNode) {
				this.toolbar.parentNode.removeChild(this.toolbar)
			}

			this.toolbarInstance.destroy()
		}
	}

	toggleControls() {
		if (this.isShowControls) {
			this.toolbar.classList.remove('show-controls')
			this.controls.classList.add('hidden')
		} else {
			this.toolbar.classList.add('show-controls')
			this.controls.classList.remove('hidden')
		}

		this.isShowControls = !this.isShowControls
	}

	hideToolbar() {
		if (this.isShowToolbar) {
			this.toolbar.classList.remove('show-controls')
			this.toolbar.classList.add('hidden')
			this.controls.classList.add('hidden')
			this.isShowToolbar = false
			this.isShowControls = false
		}
	}

	showToolbar() {
		const container = this.selection.anchorContainer

		if (!container.parent.isSection) {
			return false
		}

		const containerBoundingClientRect = container.element.getBoundingClientRect()
		let controls = []
		const scrollTop = document.body.scrollTop || document.documentElement.scrollTop
		const { plugins } = this.core
		const offsetTop = containerBoundingClientRect.top + scrollTop
		const offsetLeft = containerBoundingClientRect.left

		this.controls.innerHTML = ''

		Object.keys(plugins).forEach((pluginName) => {
			if (plugins[pluginName].getInsertControls) {
				controls = controls.concat(plugins[pluginName].getInsertControls(container, this.selection))
			}
		})

		controls.forEach((control) => {
			let field

			for (field in control.params) {
				if (typeof control.params[field] === 'function') {
					control.setEventListener(this.controlHandler, field)
				}
			}

			this.controls.appendChild(control.getElement())
		})

		document.body.appendChild(this.toolbar)

		if (controls.length) {
			this.toolbar.classList.remove('hidden')
			this.isShowToolbar = true
			this.toolbar.style.top = offsetTop + 'px'
			this.toolbar.style.left = offsetLeft + 'px'
		} else {
			this.toolbar.classList.add('hidden')
			this.isShowToolbar = false
		}
	}

	controlHandler(action, event) {
		Promise.resolve()
			.then(() => action(event, this.selection))
			.then(() => {
				this.selection.restoreSelection()
				this.hideToolbar()
			})
	}

	createControls() {
		this.toolbar = document.createElement('div')
		this.toolbar.contentEditable = false
		this.toolbar.className = 'rich-editor__toolbar hidden'
		this.controls = document.createElement('div')
		this.controls.className = 'rich-editor__controls right hidden'
		this.controlsToggler = document.createElement('button')
		this.controlsToggler.type = 'button'
		this.controlsToggler.className = 'rich-editor__toolbar-toggler'

		this.toolbar.appendChild(this.controlsToggler)
		this.toolbar.appendChild(this.controls)
		this.toolbar.addEventListener('mousedown', this.onMouseDown)
		this.controlsToggler.addEventListener('click', this.toggleControls)
		this.toolbarInstance = new Toolbar(this.toolbar)
	}
}

module.exports = Container
