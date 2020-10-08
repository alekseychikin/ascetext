import Node, { getNodeByElement } from './node'
import { Paragraph } from '../plugins/paragraph'
import { BreakLine } from '../plugins/break-line'

export default class Container extends Node {
	constructor(type) {
		super(type)

		this.isContainer = true
		this.isChanged = false
		this.isShowToolbar = false
		this.isShowControls = false
		this.createControls()
	}

	setElement(element) {
		this.element = element

		this.append(new BreakLine())
	}

	enterHandler(event, core) {
		if (event.shiftKey) {
			event.preventDefault()

			const [ childByOffset, restOffset ] = this.getChildByOffset(core.selection.anchorOffset)
			const childNode = getNodeByElement(childByOffset)
			const tail = childNode.split(restOffset)

			if (tail || restOffset) {
				childNode.connect(new BreakLine())
			} else {
				childNode.preconnect(new BreakLine())
			}

			if (core.selection.anchorAtLastPositionInContainer && childNode.type !== 'breakLine') {
				childNode.connect(new BreakLine())
			}

			core.selection.setSelection(core.selection.anchorContainer.element, core.selection.anchorOffset + 1)
		} else {
			if (!this.parent.isSection && !this.parent.isGroup) {
				return false
			}

			event.preventDefault()

			if (core.selection.focusAtLastPositionInContainer) {
				const emptyParagraph = new Paragraph()

				this.connect(emptyParagraph)

				core.selection.setSelection(emptyParagraph.element, 0)
			} else if (core.selection.anchorAtFirstPositionInContainer) {
				const emptyParagraph = new Paragraph()

				this.preconnect(emptyParagraph)

				core.selection.setSelection(this.element, 0)
			} else {
				const tail = this.split(core.selection.anchorOffset)

				core.selection.setSelection(tail.element, 0)
			}
		}
	}

	// handlePreviousForNormalizeOpportunity(element) {
	// 	let normalized

	// 	if (
	// 		element.next && element.type === element.next.type && element.normalize &&
	// 		(normalized = element.normalize(element.next))
	// 	) {
	// 		element.replaceWith(normalized, element.next.next)

	// 		return normalized
	// 	}
	// }

	backspaceHandler(event, core) {
		if (core.selection.anchorAtFirstPositionInContainer) {
			event.preventDefault()

			const container = core.selection.anchorContainer

			if (!container.parent.isSection && !container.parent.isGroup) {
				return false
			}

			const previousSelectableNode = container.getPreviousSelectableNode()

			if (!previousSelectableNode) {
				return false
			}

			if (core.selection.anchorAtLastPositionInContainer) {
				container.delete()

				if (previousSelectableNode.isContainer) {
					const offset = previousSelectableNode.getOffset()

					core.selection.setSelection(previousSelectableNode.element, offset)
				} else if (previousSelectableNode.isWidget) {
					core.selection.setSelection(previousSelectableNode.element, 0)
				}
			} else {
				if (previousSelectableNode.isContainer) {
					const offset = previousSelectableNode.getOffset()

					if (!offset) {
						previousSelectableNode.delete()
						core.selection.setSelection(container.element, 0)
					} else {
						if (container.first) {
							previousSelectableNode.isChanged = true
							previousSelectableNode.append(container.first)
						}

						container.delete()

						core.selection.setSelection(previousSelectableNode.element, offset)
					}
				} else if (previousSelectableNode.isWidget) {
					core.selection.setSelection(previousSelectableNode.element, 0)
				}
			}
		}
	}

	deleteHandler(event, core) {
		if (core.selection.anchorAtLastPositionInContainer) {
			event.preventDefault()

			const container = core.selection.anchorContainer

			if (!container.parent.isSection && !container.parent.isGroup) {
				return false
			}

			const nextSelectableNode = container.getNextSelectableNode()

			if (!nextSelectableNode) {
				return false
			}

			if (core.selection.anchorAtFirstPositionInContainer) {
				container.delete()

				if (nextSelectableNode.isContainer || nextSelectableNode.isWidget) {
					core.selection.setSelection(nextSelectableNode.element, 0)
				}
			} else {
				if (nextSelectableNode.isContainer) {
					const offset = container.getOffset()

					if (
						nextSelectableNode.first &&
						(
							nextSelectableNode.first !== nextSelectableNode.last ||
							nextSelectableNode.first.type !== 'breakLine'
						)
					) {
						container.isChanged = true
						container.append(nextSelectableNode.first)
					}

					nextSelectableNode.delete()

					core.selection.setSelection(container.element, offset)
				} else if (nextSelectableNode.isWidget) {
					core.selection.setSelection(nextSelectableNode.element, 0)
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
		this.showToolbar()
	}

	onBlur() {
		this.hideToolbar()
	}

	toggleControls = () => {
		if (this.isShowControls) {
			this.toolbar.classList.remove('show-controls')
			this.controls.classList.add('hidden')
		} else {
			this.toolbar.classList.add('show-controls')
			this.controls.classList.remove('hidden')
		}

		this.isShowControls = !this.isShowControls
	}

	hideToolbar = () => {
		if (this.isShowToolbar) {
			this.toolbar.classList.remove('show-controls')
			this.toolbar.classList.add('hidden')
			this.controls.classList.add('hidden')
			this.isShowToolbar = false
			this.isShowControls = false
		}
	}

	showToolbar = () => {
		const container = this.selection.anchorContainer
		const containerBoundingClientRect = container.element.getBoundingClientRect()
		let controls = []
		const scrollTop = document.body.scrollTop || document.documentElement.scrollTop
		const { plugins } = this.selection.core

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

		if (controls.length) {
			this.toolbar.classList.remove('hidden')
			this.isShowToolbar = true
			this.toolbar.style.top = containerBoundingClientRect.top + scrollTop + 'px'
			this.toolbar.style.left = containerBoundingClientRect.left + 'px'
		} else {
			this.toolbar.classList.add('hidden')
			this.isShowToolbar = false
		}
	}

	controlHandler = (action, event) => {
		Promise.resolve()
			.then(() => action(event, this.selection))
			.then(() => {
				this.hideToolbar()
			})
	}

	createControls() {
		this.toolbar = document.createElement('div')
		this.toolbar.className = 'rich-editor__toolbar hidden'
		this.controls = document.createElement('div')
		this.controls.className = 'rich-editor__controls right hidden'
		this.controlsToggler = document.createElement('button')
		this.controlsToggler.className = 'rich-editor__toolbar-toggler'

		this.toolbar.appendChild(this.controlsToggler)
		this.toolbar.appendChild(this.controls)
		document.body.appendChild(this.toolbar)
		this.controlsToggler.addEventListener('click', this.toggleControls)
	}
}
