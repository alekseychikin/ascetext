// import { debounce } from '../../libs/helpers.js'
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
import extractPlaceholderParams from '../utils/extract-placeholder-params.js'
import DOMHost from '../hosts/dom.js'

class Root extends Section {
	constructor() {
		super('root')
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
		this.host = params.host || new DOMHost(this)
		this.placeholder = extractPlaceholderParams(params.placeholder)
		// this.navigation = new Navigation(this)
		this.builder = new Builder(this)
		this.selection = new Selection(this)
		this.editing = new Editing(this)
		this.timeTravel = new TimeTravel(this.selection, this.builder, this.model)
		this.sizeObserver = new SizeObserver(this, params.sizeObserver)
		this.controls = params.controls ? params.controls(this) : new Controls(this)
		// this.autocomplete = new Autocomplete(this)
		this.dragndrop = new Dragndrop(this)
		this.onChangeTimer = null
		this.init = false
		this.components = params.components ? params.components : [new Toolbar(this)]
		this.components.forEach((component) => component.register(this))
		this.host.setComponents(this.components)
		this.builder.onChange(this.host.onChange)

		const children = this.builder.parseVirtualTree(this.host.getVirtualTree(node.firstChild))

		while (node.childNodes.length) {
			node.removeChild(node.childNodes[0])
		}

		this.builder.append(this.model, children.first || this.builder.createBlock())
		this.timeTravel.reset()
		this.init = true
		this.builder.onChange(this.triggerChange)
		this.node.setAttribute('contenteditable', true)
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
		clearTimeout(this.onChangeTimer)
		this.onChangeTimer = setTimeout(() => {
			this.onChangeHandlers.forEach((handler) => handler())
		}, 0)
	}

	setContent(content) {
		this.unmountAll()
		this.model = new Root(this.node)
		this.timeTravel.root = this.model
		this.node.innerHTML = ''
		this.init = false

		const container = document.createElement('div')

		container.innerHTML = content

		const children = this.builder.parse(container)

		this.components.forEach((component) => component.unregister())
		this.builder.append(this.model, children.first || this.builder.createBlock())
		this.selection.setSelection(this.model.first)
		this.timeTravel.reset()
		this.init = true
		this.components.forEach((component) => component.register(this))
	}

	getContent() {
		this.editing.save()

		return this.stringify(this.model.first)
	}

	setJson(data) {
		this.unmountAll()
		this.model = new Root(this.node)
		this.timeTravel.root = this.model
		this.node.innerHTML = ''
		this.init = false

		const children = this.builder.parseJson(data)

		this.components.forEach((component) => component.unregister())
		this.builder.append(this.model, children.first || this.builder.createBlock())
		this.timeTravel.reset()
		this.init = true
		this.components.forEach((component) => component.register(this))
	}

	getJson() {
		this.editing.save()

		return this.json(this.model.first)
	}

	unmountAll() {
		let current = this.model.first

		while (current) {
			this.builder.handleUnmount(current)

			current = current.next
		}
	}

	focus() {
		this.selection.setSelection(this.model.first)
	}

	refreshComponent() {
		this.components.forEach((component) => component.unregister())
		this.components.forEach((component) => component.register(this))
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
		// this.node.removeEventListener('keydown', this.onKeyDown)
		// this.node.removeEventListener('mouseup', this.onMouseUp)
	}
}
