// import { debounce } from '../../libs/helpers'
const Section = require('../nodes/section')
const Builder = require('./builder')
const Selection = require('./selection')
// const Navigation = require('./navigation')
const Toolbar = require('./toolbar')
const Editing = require('./editing')
const TimeTravel = require('./timetravel').TimeTravel
const BreakLine = require('../plugins/break-line').BreakLine

class Root extends Section {
	constructor(core, element) {
		super(core, 'root')

		this.element = element
	}
}

class RichEditor {
	constructor(node, plugins) {
		let children

		this.stringify = this.stringify.bind(this)
		this.onChange = this.onChange.bind(this)
		this.onNodeChange = this.onNodeChange.bind(this)

		this.node = node
		this.onChangeHandlers = []
		this.plugins = plugins
		this.model = new Root(this, node)
		// this.navigation = new Navigation(this)
		this.builder = new Builder(this)
		this.editing = new Editing(this)
		this.selection = new Selection(this)
		this.toolbar = new Toolbar(plugins, this.selection, this.builder)
		this.timeTravel = new TimeTravel(this.selection, this.builder)
		this.selection.onUpdate(this.timeTravel.onSelectionChange)
		this.selection.onUpdate(this.toolbar.onSelectionChange)

		const container = document.createElement('div')

		while (node.childNodes.length) {
			container.appendChild(node.childNodes[0])
		}

		if (children = this.builder.parse(
			container.firstChild,
			container.lastChild
		)) {
			console.log('children', children)
			this.builder.append(this.model, children)
			this.timeTravel.commit()
		} else {
			console.log('empty holder container')
		}

		this.node.setAttribute('contenteditable', true)
		this.node.addEventListener('node-change', this.onNodeChange)
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

	onChange(callback) {
		this.onChangeHandlers.push(callback)

		return function () {
			this.onChangeHandlers.splice(this.onChangeHandlers.indexOf(callback), 1)
		}
	}

	onNodeChange(changes) {
		this.timeTravel.pushChange(changes)
		this.onChangeHandlers.forEach((handler) => handler())
	}

	getContent() {
		return this.stringify(this.model.first)
	}

	destroy() {
		this.onChangeHandlers.splice(0, this.onChangeHandlers.length)
		this.node.setAttribute('contenteditable', false)
		this.node.removeEventListener('node-change', this.onNodeChange)
		this.editing.destroy()
		this.selection.destroy()
		this.toolbar.destroy()
		// this.node.removeEventListener('keydown', this.onKeyDown)
		// this.node.removeEventListener('mouseup', this.onMouseUp)
	}
}

module.exports = RichEditor
