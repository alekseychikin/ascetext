import PluginPlugin from './plugin'
import Container from '../nodes/container'
import createElement from '../utils/create-element'

export class Quote extends Container {
	constructor() {
		super('quote')

		this.setElement(createElement('blockquote'))
	}

	stringify(children) {
		return '<blockquote>' + children + '</blockquote>'
	}
}

export default class QuotePlugin extends PluginPlugin {
	get icons() {
		return {
			quote: '<svg width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M2.24 7.848c.106.323.288.62.542.887.265.28.614.498 1.047.654.431.155.987.235 1.673.235h.93c-.111 1.143-.519 2.117-1.223 2.922-.704.803-1.68 1.508-2.928 2.114l.756 1.173a11.374 11.374 0 0 0 4.216-3.075C8.42 11.406 9 10.065 9 8.735c0-1.428-.336-2.548-1.016-3.357-.68-.809-1.652-1.21-2.92-1.21-.8 0-1.5.266-2.092.801-.593.536-.89 1.162-.89 1.877 0 .343.053.678.157 1.002Zm8.5 0c.105.323.287.62.54.887.266.28.616.498 1.047.654.433.155.989.235 1.674.235h.929c-.11 1.143-.518 2.117-1.223 2.922-.704.803-1.679 1.508-2.927 2.114l.757 1.173a11.385 11.385 0 0 0 4.215-3.075c1.167-1.352 1.748-2.693 1.748-4.023 0-1.428-.337-2.548-1.016-3.357-.679-.809-1.652-1.21-2.919-1.21-.803 0-1.5.266-2.093.801-.593.536-.89 1.162-.89 1.877 0 .343.052.678.158 1.002Z" fill="#fff"/>\
</svg>'
		}
	}

	create() {
		return new Quote()
	}

	parse(element, builder, context) {
		if (element.nodeType === 1 && element.nodeName.toLowerCase() === 'blockquote') {
			const node = builder.create('quote')
			let children

			context.parsingContainer = true

			if (children = builder.parse(element.firstChild, element.lastChild, context)) {
				builder.append(node, children)
			}

			context.parsingContainer = false

			return node
		}
	}

	getInsertControls(container) {
		if (container.type === 'quote' || !container.parent.isSection) {
			return []
		}

		return [{
			slug: 'quote.create',
			label: 'Сделать цитатой',
			icon: 'quote',
			action: this.setQuote
		}]
	}

	getReplaceControls(container) {
		if (container.type === 'quote' || !container.parent.isSection) {
			return []
		}

		return [{
			slug: 'quote.create',
			label: 'Сделать цитатой',
			icon: 'quote',
			action: this.setQuote
		}]
	}

	setQuote(event, { builder, anchorContainer }) {
		if (anchorContainer.type !== 'quote') {
			const quote = builder.create('quote')

			builder.append(quote, anchorContainer.first)
			builder.replace(anchorContainer, quote)
		}
	}
}
