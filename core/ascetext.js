import Section from '../nodes/section.js'
import Builder from './builder.js'
import Selection from './selection.js'
// import Navigation from './navigation.js'
import Editing from './editing.js'
import Autocomplete from './autocomplete.js'
import TimeTravel from './timetravel.js'
import ParagraphPlugin from '../plugins/paragraph.js'
import BreakLinePlugin from '../plugins/break-line.js'
import TextPlugin from '../plugins/text.js'
import HeaderPlugin from '../plugins/header.js'
import LinkPlugin from '../plugins/link.js'
import ImagePlugin from '../plugins/image.js'
import ListPlugin from '../plugins/list.js'
import QuotePlugin from '../plugins/quote.js'
import Toolbar from '../components/toolbar.js'
import Controls from './controls.js'
import Dragndrop from './drag-n-drop.js'
import SizeObserver from './size-observer.js'
import Render from './render.js'
import Parser from './parser.js'
import Normalizer from './normalizer.js'
import extractPlaceholderParams from '../utils/extract-placeholder-params.js'

class Root extends Section {
	constructor() {
		super('root')

		this.isMount = true
		this.isRendered = true
	}
}

export default class Ascetext {
	constructor(node, params = {}) {
		this.stringify = this.stringify.bind(this)
		this.onChange = this.onChange.bind(this)
		this.triggerChange = this.triggerChange.bind(this)

		this.node = node
		this.onChangeHandlers = []
		this.plugins = params.plugins || [
			new TextPlugin(),
			new BreakLinePlugin(),
			new ParagraphPlugin(),
			new HeaderPlugin(),
			new LinkPlugin(),
			new ImagePlugin(),
			new ListPlugin(),
			new QuotePlugin()
		]
		this.icons = Object.assign(this.plugins.reduce((icons, plugin) => {
			if (plugin.icons) {
				icons = Object.assign(icons, plugin.icons)
			}

			return icons
		}, {}), params.icons || {})
		this.model = new Root()
		this.builder = new Builder(this)
		this.normalizer = new Normalizer(this, params.trimTrailingContainer)
		this.render = new Render(this)
		this.parser = new Parser(node)
		this.placeholder = extractPlaceholderParams(params.placeholder)
		// this.navigation = new Navigation(this)
		this.selection = new Selection(this)
		this.editing = new Editing(this)
		this.timeTravel = new TimeTravel(this.selection, this.builder, this.normalizer, this.model)
		this.sizeObserver = new SizeObserver(this, params.sizeObserver)
		this.controls = params.controls ? params.controls(this) : new Controls(this)
		this.autocomplete = new Autocomplete(this)
		this.dragndrop = new Dragndrop(this)
		this.init = false
		this.components = params.components ? params.components : [new Toolbar(this)]
		this.components.forEach((component) => component.register(this))
		this.selection.setComponents(this.components)

		const container = document.createElement('div')

		while (node.childNodes.length) {
			container.appendChild(node.childNodes[0])
		}

		const tree = this.parser.getVirtualTree(container.firstChild)
		const children = this.builder.parseVirtualTree(tree)

		this.builder.append(this.model, children.first || this.builder.createBlock())
		this.timeTravel.subscribe(this.triggerChange)
		this.timeTravel.reset()
		this.node.setAttribute('contenteditable', true)
		this.init = true
	}

	stringify(first) {
		let current = first
		let content = ''
		let children = ''

		while (current) {
			children = ''

			if (current.first) {
				children = this.stringify(current.first)
			}

			content += current.stringify(children)
			current = current.next
		}

		return content
	}

	json(first) {
		return this.builder.getJson(first)
	}

	onChange(callback) {
		this.onChangeHandlers.push(callback)

		return () => {
			this.onChangeHandlers.splice(this.onChangeHandlers.indexOf(callback), 1)
		}
	}

	triggerChange() {
		this.onChangeHandlers.forEach((handler) => handler())
	}

	setContent(content) {
		this.components.forEach((component) => component.unregister())
		this.builder.cutUntil(this.model.first)
		this.init = false

		const container = document.createElement('div')

		container.innerHTML = content

		const tree = this.parser.getVirtualTree(container.firstChild)
		const children = this.builder.parseVirtualTree(tree)

		this.builder.append(this.model, children.first || this.builder.createBlock())
		this.components.forEach((component) => component.register(this))
		this.timeTravel.reset()
		this.init = true
	}

	getContent() {
		this.editing.save()

		return this.stringify(this.model.first)
	}

	setJson(data) {
		this.components.forEach((component) => component.unregister())
		this.builder.cutUntil(this.model.first)
		this.init = false

		const children = this.builder.parseJson(data)

		this.builder.append(this.model, children.first || this.builder.createBlock())
		this.components.forEach((component) => component.register(this))
		this.timeTravel.reset()
		this.init = true
	}

	getJson() {
		this.editing.save()

		return this.json(this.model.first)
	}

	focus() {
		this.selection.setSelection(this.model.first)
	}

	destroy() {
		this.onChangeHandlers.splice(0)
		this.node.setAttribute('contenteditable', false)
		this.editing.destroy()
		this.selection.destroy()
		this.dragndrop.destroy()
		this.sizeObserver.destroy()
		this.controls.destroy()
		this.components.forEach((component) => component.unregister())
	}
}
