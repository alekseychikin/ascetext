import PluginPlugin from './plugin'
import InlineWidget from '../nodes/inline-widget'
import createElement from '../utils/create-element'

export class Link extends InlineWidget {
	constructor(attributes) {
		super('link', attributes)

		this.isDeleteEmpty = true
		this.controls = []

		this.setElement(createElement('a', {
			href: attributes.url
		}))
	}

	normalize(element, builder) {
		const fields = [ 'url' ]
		let areEqualElements = true

		fields.forEach((field) => {
			if (this.attributes[field] !== element.attributes[field]) {
				areEqualElements = false
			}
		})

		if (areEqualElements) {
			const node = new Link(this.attributes)
			const last = this.first.getLastNode()

			if (this.first) {
				builder.append(node, this.first)
			}

			if (element.first) {
				builder.connectWithNormalize(last, element.first)
			}

			return node
		}

		return false
	}

	duplicate(builder) {
		const duplicate = new Link(this.attributes)

		builder.connect(this, duplicate)

		return duplicate
	}

	stringify(children) {
		return '<a href="' + this.attributes.url + '">' + children + '</a>'
	}

	json(children) {
		return {
			type: this.type,
			url: this.attributes.url,
			body: children
		}
	}
}

export default class LinkPlugin extends PluginPlugin {
	constructor() {
		super()

		this.openLinkControls = this.openLinkControls.bind(this)
		this.removeLinks = this.removeLinks.bind(this)
		this.setLink = this.setLink.bind(this)
	}

	get icons() {
		return {
			link: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M14.1213 11.9995L16.2426 9.87816C17.4142 8.70658 17.4142 6.80709 16.2426 5.63552C15.0711 4.46394 13.1716 4.46394 12 5.63552L9.87868 7.75684C9.76349 7.87202 9.65964 7.99424 9.5671 8.12211L7.51002 10.1792C7.42673 8.92939 7.86273 7.65146 8.81802 6.69618L10.9393 4.57486C12.6967 2.8175 15.5459 2.8175 17.3033 4.57486C19.0607 6.33221 19.0607 9.18146 17.3033 10.9388L15.182 13.0601C13.7966 14.4455 11.7326 14.7388 10.06 13.9398L11.2234 12.7764C12.2242 13.0436 13.3362 12.7846 14.1213 11.9995Z" fill="white"/>\
<path fill-rule="evenodd" clip-rule="evenodd" d="M8.81806 10.9391C10.2036 9.55357 12.2679 9.26042 13.9406 10.0597L12.7775 11.2231C11.7765 10.9555 10.6641 11.2144 9.87872 11.9998L7.7574 14.1211C6.58583 15.2927 6.58583 17.1922 7.7574 18.3637C8.92898 19.5353 10.8285 19.5353 12 18.3637L14.1214 16.2424C14.1833 16.1805 14.242 16.1165 14.2974 16.0507L14.3073 16.0607L16.4933 13.8747C16.5605 15.107 16.1234 16.3617 15.182 17.3031L13.0607 19.4244C11.3033 21.1818 8.4541 21.1818 6.69674 19.4244C4.93938 17.667 4.93938 14.8178 6.69674 13.0604L8.81806 10.9391Z" fill="white"/>\
</svg>',
			remove: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M4 13L3 12L7 8L3 4L4 3L8 7L12 3L13 4L9 8L13 12L12 13L8 9L4 13Z" fill="white"/>\
</svg>',
			cancel: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M4 13L3 12L7 8L3 4L4 3L8 7L12 3L13 4L9 8L13 12L12 13L8 9L4 13Z" fill="white"/>\
</svg>'
		}
	}

	create(url) {
		return new Link({ url })
	}

	parse(element, builder, context) {
		if (element.nodeType === 1 && element.nodeName.toLowerCase() === 'a') {
			const url = element.getAttribute('href')
			let children

			const node = new Link({ url })

			if (children = builder.parse(element, context)) {
				builder.append(node, children)
			}

			return node
		}

		return false
	}

	parseJson(element, builder) {
		if (element.type === 'link') {
			const link = builder.create('link', element.url)
			let children

			if (children = builder.parseJson(element.body)) {
				builder.append(link, children)
			}

			return link
		}
	}

	getSelectControls(focusedNodes, isRange) {
		let link = false
		let hasText = false

		focusedNodes.forEach((item) => {
			if (item.type === 'link') {
				link = item
			}

			if (item.type === 'text') {
				hasText = true
			}
		})

		if (isRange) {
			if (link) {
				return [{
					slug: 'link.removeAll',
					label: 'Удалить ссылки',
					icon: 'link',
					selected: true,
					action: this.removeLinks
				}]
			}

			return hasText
				? [{
					slug: 'link.create',
					label: 'Сделать ссылку',
					icon: 'link',
					action: this.openLinkControls
				}]
				: []
		}

		return link
			? [{
				slug: 'link.open',
				type: 'link',
				label: link.attributes.url,
				url: link.attributes.url
			}, {
				slug: 'link.remove',
				label: 'Удалить',
				icon: 'remove',
				action: this.removeLink(link)
			}]
			: []
	}

	openLinkControls() {
		return [
			[{
				slug: 'link.input',
				type: 'input',
				placeholder: 'Введите адрес ссылки',
				autofocus: true,
				action: this.setLink,
				cancel: (event, { restoreSelection }) => restoreSelection()
			}, {
				slug: 'link.cancel',
				label: 'Отменить',
				icon: 'cancel',
				action: (event, { restoreSelection }) => restoreSelection()
			}]
		]
	}

	removeLinks(event, { builder, getSelectedItems }) {
		const selectedItems = getSelectedItems()

		selectedItems.forEach((item) => {
			if (item.type === 'link') {
				builder.connect(item, item.first)
				builder.cut(item)
			}
		})
	}

	setLink(event, { builder, getSelectedItems }) {
		const selectedItems = getSelectedItems()
		const url = event.target.value
		let link

		selectedItems.forEach((item) => {
			if (item.type === 'text') {
				link = new Link({ url })
				builder.connect(item, link)
				builder.push(link, item)
			}
		})
	}

	removeLink(link) {
		return function (event, { builder }) {
			builder.connect(link, link.first)
			builder.cut(link)
		}
	}
}
