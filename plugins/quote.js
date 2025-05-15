import PluginPlugin from './plugin.js'
import Container from '../nodes/container.js'

export class Quote extends Container {
	constructor() {
		super('quote')
	}

	render(body) {
		return {
			type: 'blockquote',
			attributes: {},
			body
		}
	}

	stringify(children) {
		return '<blockquote>' + children + '</blockquote>\n'
	}
}

export default class QuotePlugin extends PluginPlugin {
	get register() {
		return {
			'quote': Quote
		}
	}

	get icons() {
		return {
			quote: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 12V8.6c0-.56 0-.84-.109-1.054a1 1 0 0 0-.437-.437C18.24 7 17.96 7 17.4 7h-1.8c-.56 0-.84 0-1.054.109a1 1 0 0 0-.437.437C14 7.76 14 8.04 14 8.6v1.8c0 .56 0 .84.109 1.054a1 1 0 0 0 .437.437C14.76 12 15.04 12 15.6 12H19Zm0 0v2a3 3 0 0 1-3 3m-6-5V8.6c0-.56 0-.84-.109-1.054a1 1 0 0 0-.437-.437C9.24 7 8.96 7 8.4 7H6.6c-.56 0-.84 0-1.054.109a1 1 0 0 0-.437.437C5 7.76 5 8.04 5 8.6v1.8c0 .56 0 .84.109 1.054a1 1 0 0 0 .437.437C5.76 12 6.04 12 6.6 12H10Zm0 0v2a3 3 0 0 1-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
		}
	}

	get autocompleteRule() {
		return /^>$/
	}

	get autocompleteTrigger() {
		return /^>$/
	}

	autocomplete(match, builder, selection) {
		if (selection.anchorContainer.isContainer && selection.anchorContainer.parent.isSection) {
			const node = builder.getNodeByOffset(selection.anchorContainer, selection.anchorOffset)
			const atFirstPosition = selection.anchorContainer.first === node

			if (atFirstPosition) {
				const quote = builder.create('quote')

				builder.replace(selection.anchorContainer, quote)
				builder.moveTail(selection.anchorContainer, quote, match[0].length)
			}
		}
	}

	parseJson(element, builder) {
		if (element.type === 'quote') {
			return builder.create('quote')
		}
	}

	parseTree(element, builder) {
		if (element.type === 'blockquote') {
			return builder.create('quote')
		}
	}

	getInsertControls(container) {
		if (container.type === 'quote' || !container.parent.isSection) {
			return []
		}

		return [{
			slug: 'quote.create',
			label: 'Block quote',
			icon: 'quote',
			action: this.setQuote
		}]
	}

	getReplaceControls(focusedNodes) {
		const containers = focusedNodes.filter((node) => node.isContainer && node.parent.isSection)
		const quotes = containers.filter((node) => node.type === 'quote')

		if (!containers.length) {
			return []
		}

		return [{
			slug: 'quote.create',
			label: 'Block quote',
			icon: 'quote',
			selected: quotes.length > 0,
			action: this.setQuote
		}]
	}

	setQuote(event, { builder, focusedNodes }) {
		focusedNodes.forEach((item) => {
			if (item.isContainer && item.parent.isSection && item.type !== 'quote') {
				const quote = builder.create('quote')

				builder.replace(item, quote)
				builder.moveTail(item, quote, 0)
			}
		})
	}
}
