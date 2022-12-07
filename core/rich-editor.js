// import { debounce } from '../../libs/helpers'
import Section from '../nodes/section'
import Builder from './builder'
import Selection from './selection'
// import Navigation from './navigation'
import Editing from './editing'
import Autocomplete from './autocomplete'
import TimeTravel from './timetravel'
import ParagraphPlugin from '../plugins/paragraph'
import BreakLinePlugin from '../plugins/break-line'
import TextPlugin from '../plugins/text'
import HeaderPlugin from '../plugins/header'
import LinkPlugin from '../plugins/link'
import ImagePlugin from '../plugins/image'
import ListPlugin from '../plugins/list'
import QuotePlugin from '../plugins/quote'
import Toolbar from './toolbar'
import Controls from './controls'
import Dragndrop from './drag-n-drop'
import SizeObserver from './size-observer'

class Root extends Section {
	constructor(element) {
		super('root')

		this.element = element
	}
}

export default class RichEditor {
	constructor(node, params) {
		this.stringify = this.stringify.bind(this)
		this.onChange = this.onChange.bind(this)
		this.onNodeChange = this.onNodeChange.bind(this)

		this.node = node
		this.onChangeHandlers = []
		this.plugins = Object.assign({
			text: new TextPlugin(),
			breakLine: new BreakLinePlugin(),
			paragraph: new ParagraphPlugin(),
			header: new HeaderPlugin(),
			link: new LinkPlugin(),
			image: new ImagePlugin(),
			list: new ListPlugin(),
			quote: new QuotePlugin()
		}, params.plugins || {})
		this.icons = Object.assign(Object.keys(this.plugins).reduce((icons, plugin) => {
			if (this.plugins[plugin].icons) {
				icons = Object.assign(icons, this.plugins[plugin].icons)
			}

			return icons
		}, {}), params.icons || {})
		this.model = new Root(node)
		// this.navigation = new Navigation(this)
		this.builder = new Builder(this)
		this.editing = new Editing(this)
		this.selection = new Selection(this)
		this.timeTravel = new TimeTravel(this.selection, this.builder)
		this.sizeObserver = params.sizeObserver ? params.sizeObserver(this) : new SizeObserver(this)
		this.controls = params.controls ? params.controls(this) : new Controls(this)
		this.toolbar = params.toolbar ? params.toolbar(this) : new Toolbar(this)
		this.autocomplete = new Autocomplete(this)
		this.dragndrop = new Dragndrop(this)
		this.onChangeTimer = null

		const container = document.createElement('div')

		while (node.childNodes.length) {
			container.appendChild(node.childNodes[0])
		}

		const children = this.builder.parse(container) || this.builder.createBlock()

		this.builder.append(this.model, children)
		this.timeTravel.reset()
		this.node.setAttribute('contenteditable', true)
		window.addEventListener('load', this.sizeObserver.update)
		document.addEventListener('DOMContentLoaded', this.sizeObserver.update)
		this.node.addEventListener('load', this.sizeObserver.update, true)
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
		const content = []
		let children = []
		let current = first

		while (current) {
			if (current.first) {
				children = this.json(current.first)
			}

			content.push(current.json(children))
			current = current.next
		}

		return content
	}

	onChange(callback) {
		this.onChangeHandlers.push(callback)

		return () => {
			this.onChangeHandlers.splice(this.onChangeHandlers.indexOf(callback), 1)
		}
	}

	onNodeChange(changes) {
		this.timeTravel.pushChange(changes)
		this.sizeObserver.update()

		clearTimeout(this.onChangeTimer)
		this.onChangeTimer = setTimeout(() => {
			this.onChangeHandlers.forEach((handler) => handler())
		}, 0)
	}

	setContent(content) {
		this.unmountAll()
		this.model = new Root(this.node)
		this.node.innerHTML = ''

		const container = document.createElement('div')

		container.innerHTML = content

		const children = this.builder.parse(container) || this.builder.createBlock()
		this.builder.append(this.model, children)
		this.timeTravel.reset()
	}

	getContent() {
		this.editing.save()

		return this.stringify(this.model.first)
	}

	setJson(data) {
		this.unmountAll()
		this.model = new Root(this.node)
		this.node.innerHTML = ''

		const children = this.builder.parseJson(data) || this.builder.createBlock()

		this.builder.append(this.model, children)
		this.timeTravel.reset()
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
		this.selection.setSelection(this.model.first, 0)
	}

	destroy() {
		this.onChangeHandlers.splice(0, this.onChangeHandlers.length)
		this.node.setAttribute('contenteditable', false)
		this.editing.destroy()
		this.selection.destroy()
		this.toolbar.destroy()
		this.dragndrop.destroy()
		this.sizeObserver.destroy()
		// this.node.removeEventListener('keydown', this.onKeyDown)
		// this.node.removeEventListener('mouseup', this.onMouseUp)
	}
}
