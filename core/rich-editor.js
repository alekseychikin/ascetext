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
import UserMentionPlugin from '../plugins/user-mention'
import Toolbar from './toolbar'

class Root extends Section {
	constructor(core, element) {
		super(core, 'root')

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
			userMention: new UserMentionPlugin(),
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
		this.model = new Root(this, node)
		// this.navigation = new Navigation(this)
		this.builder = new Builder(this)
		this.editing = new Editing(this)
		this.selection = new Selection(this)
		this.timeTravel = new TimeTravel(this.selection, this.builder)
		this.toolbar = params.toolbar ? params.toolbar(this) : new Toolbar(this)
		this.autocomplete = new Autocomplete(this.plugins, this.selection, this.builder, this.editing)

		const container = document.createElement('div')

		while (node.childNodes.length) {
			container.appendChild(node.childNodes[0])
		}

		const children = this.builder.parse(
			container.firstChild,
			container.lastChild
		) || this.builder.createBlock()
		this.builder.append(this.model, children)

		this.timeTravel.begin()
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

	onChange(callback) {
		this.onChangeHandlers.push(callback)

		return () => {
			this.onChangeHandlers.splice(this.onChangeHandlers.indexOf(callback), 1)
		}
	}

	onNodeChange(changes) {
		this.timeTravel.pushChange(changes)
		this.onChangeHandlers.forEach((handler) => handler())
	}

	getContent() {
		this.editing.save()

		return this.stringify(this.model.first)
	}

	destroy() {
		this.onChangeHandlers.splice(0, this.onChangeHandlers.length)
		this.node.setAttribute('contenteditable', false)
		this.editing.destroy()
		this.selection.destroy()
		this.toolbar.destroy()
		// this.node.removeEventListener('keydown', this.onKeyDown)
		// this.node.removeEventListener('mouseup', this.onMouseUp)
	}
}
