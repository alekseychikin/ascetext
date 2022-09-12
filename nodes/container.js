import Node from './node'
import Toolbar from '../core/toolbar'

export default class Container extends Node {
	constructor(type, attributes = {}) {
		super(type, attributes)

		this.toggleControls = this.toggleControls.bind(this)
		this.hideToolbar = this.hideToolbar.bind(this)
		this.showToolbar = this.showToolbar.bind(this)
		this.controlHandler = this.controlHandler.bind(this)
		this.onMouseDown = this.onMouseDown.bind(this)

		this.isContainer = true
		this.isChanged = false
		this.isShowToolbar = false
		this.isShowControls = false
		// this.createControls()
	}

	get isEmpty() {
		return !this.first || this.first === this.last && this.first.type === 'breakLine'
	}

	append(target, last, { builder, appendDefault }) {
		if (this.isEmpty && this.first) {
			builder.cut(this.first)
		}

		appendDefault(this, target, last)
	}

	onMouseDown() {
		this.selection.focusedControl = true
	}

	enterHandler(
		event,
		{
			builder,
			anchorOffset,
			anchorContainer,
			setSelection,
			focusAtLastPositionInContainer,
			anchorAtFirstPositionInContainer,
		}
	) {
		if (event.shiftKey) {
			event.preventDefault()

			if (focusAtLastPositionInContainer && this.last.type !== 'breakLine') {
				const br = builder.create('breakLine')

				builder.connect(br, builder.create('breakLine'))
				builder.append(this, br)
			} else {
				builder.insert(this, builder.create('breakLine'), anchorOffset)
			}

			setSelection(anchorContainer, anchorOffset + 1)
		} else {
			let newBlock

			if (!this.parent.isSection && !this.parent.isGroup) {
				return false
			}

			event.preventDefault()

			if (anchorAtFirstPositionInContainer) {
				builder.preconnect(this, builder.createBlock())
				setSelection(this)
			} else {
				if (focusAtLastPositionInContainer) {
					newBlock = builder.createBlock()
					builder.connect(this, newBlock)
				} else {
					newBlock = this.duplicate(builder)
				}

				builder.moveTail(this, newBlock, anchorOffset)
				setSelection(newBlock)
			}
		}
	}

	backspaceHandler(
		event,
		{
			builder,
			anchorAtFirstPositionInContainer,
			anchorAtLastPositionInContainer,
			anchorContainer,
			setSelection
		}
	) {
		if (anchorAtFirstPositionInContainer) {
			event.preventDefault()

			if (!anchorContainer.parent.isSection && !anchorContainer.parent.isGroup) {
				return false
			}

			const container = anchorContainer
			const previousSelectableNode = container.getPreviousSelectableNode()

			if (!previousSelectableNode) {
				return false
			}

			if (anchorAtLastPositionInContainer) {
				builder.cut(container)

				if (previousSelectableNode.isContainer) {
					setSelection(previousSelectableNode, -1)
				} else if (previousSelectableNode.isWidget) {
					setSelection(previousSelectableNode)
				}
			} else if (previousSelectableNode.isContainer) {
				const offset = previousSelectableNode.getOffset()

				if (previousSelectableNode.isEmpty) {
					if (previousSelectableNode.parent.isSection) {
						builder.cut(previousSelectableNode)
						setSelection(container)
					} else {
						builder.append(previousSelectableNode, container.first)
						builder.cut(container)
						setSelection(previousSelectableNode)
					}
				} else {
					if (container.first) {
						builder.append(previousSelectableNode, container.first)
					}

					builder.cut(container)
					setSelection(previousSelectableNode, offset)
				}
			} else if (previousSelectableNode.isWidget) {
				setSelection(previousSelectableNode)
			}
		}
	}

	deleteHandler(
		event,
		{
			builder,
			anchorAtLastPositionInContainer,
			anchorAtFirstPositionInContainer,
			anchorContainer,
			setSelection
		}
	) {
		if (anchorAtLastPositionInContainer) {
			event.preventDefault()

			if (!anchorContainer.parent.isSection && !anchorContainer.parent.isGroup) {
				return false
			}

			const container = anchorContainer
			const nextSelectableNode = container.getNextSelectableNode()

			if (!nextSelectableNode) {
				return false
			}

			if (anchorAtFirstPositionInContainer) {
				builder.cut(container)

				if (nextSelectableNode.isContainer || nextSelectableNode.isWidget) {
					setSelection(nextSelectableNode)
				}
			} else if (nextSelectableNode.isContainer) {
				const offset = container.getOffset()

				if (!nextSelectableNode.hasOnlyBr) {
					builder.append(container, nextSelectableNode.first)
				}

				builder.cut(nextSelectableNode)

				setSelection(container, offset)
			} else if (nextSelectableNode.isWidget) {
				setSelection(nextSelectableNode)
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
