import { debounce } from '../../libs/helpers'
import { getNodeByElement } from './nodes/node'
import Section from './nodes/section'
import Selection from './selection'
import Navigation from './navigation'
import Editing from './editing'
import Toolbar from './toolbar'

class Root extends Section {
	constructor(element, onUpdate) {
		super('root')

		this.element = element
		this.onUpdate = onUpdate
	}
}

export default class RichEditor {
	onKeyDown = (event) => {
		if (this.selection.focused) {
			this.editing.onKeyDown(event)
		}
	}

	onInput = () => {
		this.updateSelection()
	}

	onMouseDown = (event) => {
		if (this.model.element.contains(event.target)) {
			const anchorNode = getNodeByElement(event.target)

			if (anchorNode && anchorNode.isWidget) {
				this.selection.setSelection(anchorNode.element, 0)
			}
		} else {
			this.onBlur()
		}
	}

	onSelectionChange = () => {
		this.updateSelection()
	}

	updateSelection = () => {
		this.selection.update()
		// this.toolbar.update()
		this.editing.onSelectionChange()
	}

	onBlur = () => {
		// console.log('onBlur')
		this.selection.blur()
		// this.toolbar.update()
		this.editing.onSelectionChange()
	}

	parse = (firstElement, lastElement, context = { selection: this.selection }) => {
		let currentElement = firstElement
		let result
		let current
		let next
		let value

		while (currentElement) {
			next = Object.keys(this.plugins).reduce((parsed, pluginName) => {
				if (parsed) return parsed

				return this.plugins[pluginName].parse(currentElement, this.parse, context)
			}, false)

			if (next) {
				value = this.handleParseNext(result, current, next)

				current = value.current
				result = value.result
			} else {
				console.log('not matched', currentElement)

				if (currentElement.childNodes && (next = this.parse(currentElement.firstChild, currentElement.lastChild))) {
					if (next) {
						value = this.handleParseNext(result, current, next)

						current = value.current
						result = value.result
					}
				}
			}

			if (currentElement === lastElement) {
				break
			}

			currentElement = currentElement.nextSibling
		}

		if (result) {
			next = result.getLastNode()

			if (next.type === 'breakLine' && next.previous && next.previous.type !== 'breakLine' && result !== next) {
				next.delete()
			}
		}

		return result
	}

	handleParseNext(result, current, next) {
		let normalized

		if (!result) {
			result = next
		}

		if (current) {
			if (
				current.type === next.type && current.normalize &&
				(normalized = current.normalize(next))
			) {
				current.replaceWith(normalized)

				if (result === current) {
					result = normalized
				}

				next = normalized
			} else {
				current.connect(next)
			}
		}

		current = next.getLastNode()

		return { result, current }
	}

	stringify = (first) => {
		let current = first
		let content = ''
		let children = ''

		while (current) {
			if (current.first) {
				children = this.stringify(current.first)
			}

			content += current.stringify(children)
			current = current.next
		}

		return content
	}

	onUpdate = debounce(() => {
		if (process.env.ENV === 'develop') {
			if (this.devTool) {
				this.devTool.renderModel()
			}
		}
	}, 50)

	constructor(node, plugins) {
		let children

		this.node = node
		this.plugins = plugins
		this.model = new Root(node, this.onUpdate)
		// this.navigation = new Navigation(this)
		this.editing = new Editing(this)
		this.selection = new Selection(this)
		this.toolbar = new Toolbar(this)

		const container = document.createElement('div')

		while (node.childNodes.length) {
			container.appendChild(node.childNodes[0])
		}

		if (children = this.parse(
			container.firstChild,
			container.lastChild
		)) {
			console.log('children', children)
			this.model.append(children)
		} else {
			console.log('empty holder container')
		}

		this.initDevtool()

		this.node.setAttribute('contenteditable', true)
		document.addEventListener('selectionchange', this.onSelectionChange)
		document.addEventListener('mousedown', this.onMouseDown)
		document.addEventListener('keydown', this.onKeyDown)
		document.addEventListener('input', this.onInput)
	}

	async initDevtool() {
		if (process.env.ENV === 'develop') {
			const rempl = await import('rempl')
			const { default: remplTool } = await import('./remplTool')

			this.remplTool = rempl.createPublisher('richEditorTool', function(settings, callback) {
				callback(null, 'script', '(' + remplTool.toString() + ')()')
			})
			this.devTool = {
				renderModel: () => {
					const model = this.devTool.getModel(this.model)

					this.remplTool.ns('model').publish(model)
				},
				getModel: (model) => {
					let current = model
					let item, type
					const result = []

					while (current) {
						if (current.type === 'text') {
							item = {
								type: 'text',
								content: current.content
							}
						} else {
							type = 'node'

							if (current.isSection) {
								type = 'section'
							} else if (current.isInlineWidget) {
								type = 'inlineWidget'
							} else if (current.isWidget) {
								type = 'widget'
							} else if (current.isContainer) {
								type = 'container'
							}

							item = {
								name: current.type,
								type,
								children: this.devTool.getModel(current.first)
							}

							if (current.isContainer) {
								item.isChanged = current.isChanged
							}
						}

						result.push(item)
						current = current.next
					}

					return result
				},
				renderSelection: (selection) => {
					this.remplTool.ns('selection').publish(selection)
				}
			}

			this.devTool.renderModel()
		}
	}

	getContent() {
		this.editing.saveChanges()

		return this.stringify(this.model.first)
	}

	destroy() {
		this.node.setAttribute('contenteditable', false)
		this.node.removeEventListener('keydown', this.onKeyDown)
		this.node.removeEventListener('mouseup', this.onMouseUp)
	}
}
