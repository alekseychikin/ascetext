import PluginPlugin from './plugin.js'
import InlineWidget from '../nodes/inline-widget.js'
import createElement from '../utils/create-element.js'
import isHtmlElement from '../utils/is-html-element.js'

export class Link extends InlineWidget {
	constructor(attributes) {
		super('link', attributes)

		this.isDeleteEmpty = true
	}

	render() {
		return createElement('a', {
			href: this.attributes.url
		})
	}

	normalize(element, builder) {
		if (element.type !== 'link') {
			return false
		}

		const fields = [ 'url' ]
		let areEqualElements = true

		fields.forEach((field) => {
			if (this.attributes[field] !== element.attributes[field]) {
				areEqualElements = false
			}
		})

		if (areEqualElements) {
			return builder.create('link', { url: this.attributes.url })
		}

		return false
	}

	duplicate(builder) {
		return builder.create('link', { url: this.attributes.url })
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
	get register() {
		return {
			'link': Link
		}
	}

	constructor() {
		super()

		this.openLinkControls = this.openLinkControls.bind(this)
		this.removeLinks = this.removeLinks.bind(this)
		this.setLink = this.setLink.bind(this)
	}

	get icons() {
		return {
			link: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m9.172 14.829 5.657-5.657M7.05 11.293l-1.414 1.414a4 4 0 1 0 5.657 5.657l1.413-1.414m-1.414-9.9 1.414-1.414a4 4 0 0 1 5.657 5.657l-1.414 1.414" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			remove: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 20v-2m2-2h2M7.05 11.293l-1.413 1.414a4 4 0 1 0 5.657 5.657l1.413-1.414M6 8H4m4-4v2m3.293 1.05 1.414-1.414a4 4 0 0 1 5.657 5.657l-1.414 1.414" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			cancel: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 20v-2m2-2h2M7.05 11.293l-1.413 1.414a4 4 0 1 0 5.657 5.657l1.413-1.414M6 8H4m4-4v2m3.293 1.05 1.414-1.414a4 4 0 0 1 5.657 5.657l-1.414 1.414" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
		}
	}

	get autocompleteRule() {
		return /\bhttps?:\/\/[a-zA-Z0-9\-_]{2,}\.[a-zA-Z]{2,}[^\s,]*/
	}

	parse(element, builder) {
		if (isHtmlElement(element) && element.matches('a')) {
			return builder.create('link', { url: element.getAttribute('href') })
		}
	}

	parseJson(element, builder) {
		if (element.type === 'link') {
			return builder.create('link', { url: element.url })
		}
	}

	parseTreeElement(element, builder) {
		if (element.type === 'a') {
			return builder.create('link', { url: element.attributes.href })
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
					label: 'Remove links',
					icon: 'link',
					selected: true,
					action: this.removeLinks
				}]
			}

			return hasText
				? [{
					slug: 'link.create',
					label: 'Create link',
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
				label: 'Remove',
				icon: 'remove',
				action: this.removeLink
			}]
			: []
	}

	openLinkControls() {
		return [
			[{
				slug: 'link.input',
				type: 'input',
				placeholder: 'Type link url...',
				autofocus: true,
				action: this.setLink,
				cancel: (event, { restoreSelection }) => restoreSelection()
			}, {
				slug: 'link.cancel',
				label: 'Cancel',
				icon: 'cancel',
				action: (event, { restoreSelection }) => restoreSelection()
			}]
		]
	}

	removeLinks(event, { builder, getSelectedItems }) {
		const selectedItems = getSelectedItems()

		selectedItems.forEach((item) => {
			if (item.type === 'link') {
				builder.replace(item, item.first)
			}
		})
	}

	setLink(event, { builder, getSelectedItems }) {
		const selectedItems = getSelectedItems()
		let url = event.target.value
		let link

		if (!url.match(/^(https?:\/\/|^\/)/)) {
			url = 'https://' + url
		}

		selectedItems.forEach((item) => {
			if (item.type === 'text') {
				link = builder.create('link', { url })
				builder.replace(item, link)
				builder.push(link, item)
			}
		})
	}

	removeLink(event, { builder, focusedNodes }) {
		focusedNodes.forEach((node) => {
			if (node.type === 'link') {
				builder.replace(node, node.first)
			}
		})
	}

	wrap(match, builder) {
		const link = builder.create('link', { url: match.attributes.content })

		builder.append(link, match)

		return link
	}

	unwrap(node, builder) {
		let current = node

		while (current) {
			if (current.type === 'link') {
				builder.replace(current, current.first)
			}

			current = current.parent
		}
	}
}
