const PluginPlugin = require('./plugin')
const InlineWidget = require('../nodes/inline-widget')
const ControlButton = require('../controls/button')
const ControlInput = require('../controls/input')
const ControlLink = require('../controls/link')
const createElement = require('../create-element')

class Link extends InlineWidget {
	removeLink() {
		this.connect(this.first)
		this.delete()
		this.core.selection.restoreSelection()
	}

	constructor(core, url) {
		super(core, 'link')

		this.removeLink = this.removeLink.bind(this)

		this.fields = [ 'url' ]
		this.url = url
		this.isDeleteEmpty = true
		this.controls = []

		this.setElement(createElement('a', {
			href: this.url
		}))
	}

	normalize(element, connectWithNormalize) {
		const fields = [ 'url' ]
		let areEqualElements = true

		fields.forEach((field) => {
			if (this[field] !== element[field]) {
				areEqualElements = false
			}
		})

		if (areEqualElements) {
			const node = new Link(this.core, this.url)
			const last = this.first.getLastNode()

			if (this.first) {
				node.append(this.first)
			}

			if (element.first) {
				connectWithNormalize(last, element.first)
			}

			return node
		}

		return false
	}

	duplicate() {
		const duplicate = new Link(this.core, this.url)

		this.connect(duplicate)

		return duplicate
	}

	stringify(children) {
		return '<a href="' + this.url + '">' + children + '</a>'
	}
}

class LinkPlugin extends PluginPlugin {
	constructor() {
		super()

		this.openLinkControls = this.openLinkControls.bind(this)
		this.removeLinks = this.removeLinks.bind(this)
		this.setLink = this.setLink.bind(this)
	}

	parse(element, parse, context) {
		if (element.nodeType === 1 && element.nodeName.toLowerCase() === 'a') {
			const url = element.getAttribute('href')
			let children

			const node = new Link(this.core, url)

			if (children = parse(element.firstChild, element.lastChild, context)) {
				node.append(children)
			}

			return node
		}

		return false
	}

	getSelectControls(focusedNodes) {
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

		if (this.core.selection.isRange) {
			if (link) {
				return [
					new ControlButton({
						label: 'Удалить ссылки',
						icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M14.1213 11.9995L16.2426 9.87816C17.4142 8.70658 17.4142 6.80709 16.2426 5.63552C15.0711 4.46394 13.1716 4.46394 12 5.63552L9.87868 7.75684C9.76349 7.87202 9.65964 7.99424 9.5671 8.12211L7.51002 10.1792C7.42673 8.92939 7.86273 7.65146 8.81802 6.69618L10.9393 4.57486C12.6967 2.8175 15.5459 2.8175 17.3033 4.57486C19.0607 6.33221 19.0607 9.18146 17.3033 10.9388L15.182 13.0601C13.7966 14.4455 11.7326 14.7388 10.06 13.9398L11.2234 12.7764C12.2242 13.0436 13.3362 12.7846 14.1213 11.9995Z" fill="white"/>\
<path fill-rule="evenodd" clip-rule="evenodd" d="M8.81806 10.9391C10.2036 9.55357 12.2679 9.26042 13.9406 10.0597L12.7775 11.2231C11.7765 10.9555 10.6641 11.2144 9.87872 11.9998L7.7574 14.1211C6.58583 15.2927 6.58583 17.1922 7.7574 18.3637C8.92898 19.5353 10.8285 19.5353 12 18.3637L14.1214 16.2424C14.1833 16.1805 14.242 16.1165 14.2974 16.0507L14.3073 16.0607L16.4933 13.8747C16.5605 15.107 16.1234 16.3617 15.182 17.3031L13.0607 19.4244C11.3033 21.1818 8.4541 21.1818 6.69674 19.4244C4.93938 17.667 4.93938 14.8178 6.69674 13.0604L8.81806 10.9391Z" fill="white"/>\
</svg>',
						selected: true,
						action: this.removeLinks
					})
				]
			}

			return hasText
				? [
						new ControlButton({
							label: 'Сделать ссылку',
								icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
		<path fill-rule="evenodd" clip-rule="evenodd" d="M14.1213 11.9995L16.2426 9.87816C17.4142 8.70658 17.4142 6.80709 16.2426 5.63552C15.0711 4.46394 13.1716 4.46394 12 5.63552L9.87868 7.75684C9.76349 7.87202 9.65964 7.99424 9.5671 8.12211L7.51002 10.1792C7.42673 8.92939 7.86273 7.65146 8.81802 6.69618L10.9393 4.57486C12.6967 2.8175 15.5459 2.8175 17.3033 4.57486C19.0607 6.33221 19.0607 9.18146 17.3033 10.9388L15.182 13.0601C13.7966 14.4455 11.7326 14.7388 10.06 13.9398L11.2234 12.7764C12.2242 13.0436 13.3362 12.7846 14.1213 11.9995Z" fill="white"/>\
		<path fill-rule="evenodd" clip-rule="evenodd" d="M8.81806 10.9391C10.2036 9.55357 12.2679 9.26042 13.9406 10.0597L12.7775 11.2231C11.7765 10.9555 10.6641 11.2144 9.87872 11.9998L7.7574 14.1211C6.58583 15.2927 6.58583 17.1922 7.7574 18.3637C8.92898 19.5353 10.8285 19.5353 12 18.3637L14.1214 16.2424C14.1833 16.1805 14.242 16.1165 14.2974 16.0507L14.3073 16.0607L16.4933 13.8747C16.5605 15.107 16.1234 16.3617 15.182 17.3031L13.0607 19.4244C11.3033 21.1818 8.4541 21.1818 6.69674 19.4244C4.93938 17.667 4.93938 14.8178 6.69674 13.0604L8.81806 10.9391Z" fill="white"/>\
		</svg>',
							action: this.openLinkControls
						})
					]
				: []
		}

		return link
			? [
					new ControlLink({
						label: link.url,
						url: link.url
					}),
					new ControlButton({
						label: 'Удалить',
						icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
		<path fill-rule="evenodd" clip-rule="evenodd" d="M4 13L3 12L7 8L3 4L4 3L8 7L12 3L13 4L9 8L13 12L12 13L8 9L4 13Z" fill="white"/>\
		</svg>',
						action: this.removeLink
					})
				]
			: []
	}

	openLinkControls() {
		this.core.selection.renderControls([
			[
				new ControlInput({
					placeholder: 'Введите адрес ссылки',
					autofocus: true,
					action: this.setLink,
					cancel: () => this.core.selection.restoreSelection()
				}),
				new ControlButton({
					label: 'Отменить',
					icon: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
	<path fill-rule="evenodd" clip-rule="evenodd" d="M4 13L3 12L7 8L3 4L4 3L8 7L12 3L13 4L9 8L13 12L12 13L8 9L4 13Z" fill="white"/>\
	</svg>',
					action: () => this.core.selection.restoreSelection()
				})
			]
		])
	}

	removeLinks() {
		const selectedItems = this.core.selection.getSelectedItems()

		selectedItems.forEach((item) => {
			if (item.type === 'link') {
				item.connect(item.first)
				item.delete()
			}
		})
	}

	setLink(event) {
		const selectedItems = this.core.selection.getSelectedItems()
		const url = event.target.value
		let link

		selectedItems.forEach((item) => {
			if (item.type === 'text') {
				link = new Link(this.core, url)
				item.connect(link)
				link.push(item)
			}
		})
		this.core.selection.restoreSelection()
	}
}

module.exports.LinkPlugin = LinkPlugin
