// import { debounce } from '../../libs/helpers'
const getNodeByElement = require('./nodes/node').getNodeByElement
const Section = require('./nodes/section')
const Selection = require('./selection')
const Navigation = require('./navigation')
const Editing = require('./editing')

class Root extends Section {
	constructor(element, onUpdate) {
		super('root')

		this.element = element
		this.onUpdate = onUpdate
	}
}

class RichEditor {
	constructor(node, plugins) {
		let children

		this.parse = this.parse.bind(this)
		this.stringify = this.stringify.bind(this)
		this.onUpdate = this.onUpdate.bind(this)

		this.node = node
		this.plugins = plugins
		this.model = new Root(node, this.onUpdate)
		// this.navigation = new Navigation(this)
		this.editing = new Editing(this)
		this.selection = new Selection(this)
		this.selection.onUpdate = this.editing.onSelectionChange

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

		this.node.setAttribute('contenteditable', true)
	}

	parse(firstElement, lastElement, context = { selection: this.selection }) {
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

	stringify(first) {
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

	// onUpdate = debounce(() => {
	// 	if (process.env.ENV === 'develop') {
	// 		if (this.devTool) {
	// 			this.devTool.renderModel()
	// 		}
	// 	}
	// }, 50)

	onUpdate() {
		if (process.env.ENV === 'develop') {
			if (this.devTool) {
				this.devTool.renderModel()
			}
		}
	}

	getContent() {
		this.editing.saveChanges()

		return this.stringify(this.model.first)
	}

	destroy() {
		this.node.setAttribute('contenteditable', false)
		// this.node.removeEventListener('keydown', this.onKeyDown)
		// this.node.removeEventListener('mouseup', this.onMouseUp)
	}
}

module.exports = RichEditor
