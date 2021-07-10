// import { debounce } from '../../libs/helpers'
const Section = require('./nodes/section')
const Selection = require('./selection')
// const Navigation = require('./navigation')
const Toolbar = require('./toolbar')
const Editing = require('./editing')
const TimeTravel = require('./timetravel').TimeTravel
const BreakLine = require('./plugins/break-line').BreakLine

class Root extends Section {
	constructor(core, element) {
		super(core, 'root')

		this.element = element
	}
}

const ignoreParsingElements = ['style', 'script']

class RichEditor {
	constructor(node, plugins) {
		let children

		this.parse = this.parse.bind(this)
		this.stringify = this.stringify.bind(this)
		this.onUpdate = this.onUpdate.bind(this)
		this.connectWithNormalize = this.connectWithNormalize.bind(this)
		this.onNodeChange = this.onNodeChange.bind(this)

		this.node = node
		this.plugins = plugins
		this.model = new Root(this, node, this.onUpdate)
		// this.navigation = new Navigation(this)
		this.editing = new Editing(this)
		this.selection = new Selection(this)
		this.toolbar = new Toolbar(plugins, this.selection)
		this.timeTravel = new TimeTravel(this.selection)
		this.selection.onUpdate(this.timeTravel.onSelectionChange)
		this.selection.onUpdate(this.toolbar.onSelectionChange)

		Object.keys(this.plugins).forEach((pluginName) => this.plugins[pluginName].setCore(this))

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
			this.timeTravel.commit()
		} else {
			console.log('empty holder container')
		}

		this.node.setAttribute('contenteditable', true)
		this.node.addEventListener('node-change', this.onNodeChange)
	}

	parse(firstElement, lastElement, context = { selection: this.selection }) {
		let currentElement = firstElement
		let first
		let previous
		let current
		let value

		while (currentElement) {
			// eslint-disable-next-line no-loop-func
			current = Object.keys(this.plugins).reduce((parsed, pluginName) => {
				if (parsed) return parsed

				return this.plugins[pluginName].parse(currentElement, this.parse, context)
			}, false)

			if (
				!current &&
				!ignoreParsingElements.includes(currentElement.nodeName.toLowerCase()) &&
				currentElement.childNodes.length
			) {
				current = this.parse(currentElement.firstChild, currentElement.lastChild)
			}

			if (current) {
				value = this.handleParseNext(first, previous, current)

				if (value.current && value.current.isContainer) {
					if (!value.current.first) {
						value.current.push(new BreakLine(this))
					} else if (
						value.current.last.type === 'breakLine' &&
						value.current.last.previous &&
						value.current.last.previous.type !== 'breakLine'
					) {
						value.current.push(new BreakLine(this))
					}
				}

				previous = value.current
				first = value.first
			} else {
				console.log('not matched', currentElement)
			}

			if (currentElement === lastElement) {
				break
			}

			currentElement = currentElement.nextSibling
		}

		return first
	}

	handleParseNext(first, previous, current) {
		if (current.isDeleteEmpty && !current.first) {
			return { first, current: previous }
		}

		if (!first) {
			first = current
		}

		if (previous) {
			this.connectWithNormalize(previous, current, (normalized) => {
				if (first === previous) {
					first = normalized
				}

				current = normalized
			})
		}

		return { first, current: current.getLastNode() }
	}

	connectWithNormalize(previous, current, callback) {
		let normalized

		if (
			previous.type === current.type && previous.normalize &&
			(normalized = previous.normalize(current, this.connectWithNormalize))
		) {
			if (current.next) {
				normalized.connect(current.next)
			}

			previous.replaceUntil(normalized)

			if (typeof (callback) === 'function') {
				callback(normalized)
			}
		} else {
			previous.connect(current)
		}
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

	onNodeChange(event) {
		this.timeTravel.pushChange(event.changes)
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
