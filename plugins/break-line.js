import InlineWidget from '../nodes/inline-widget.js'
import PluginPlugin from './plugin.js'
import isElementBr from '../utils/is-element-br.js'

class BreakLine extends InlineWidget {
	constructor() {
		super('breakLine')

		this.length = 1
	}

	render() {
		return {
			type: 'br',
			attributes: {},
			body: []
		}
	}

	split(builder) {
		if (this.next) {
			return {
				head: this,
				tail: this.next
			}
		}

		const text = builder.create('text', { content: '' })

		builder.append(this.parent, text)

		return {
			head: this,
			tail: text
		}
	}

	stringify() {
		return '<br />'
	}

	json() {
		return { type: this.type }
	}
}

export default class BreakLinePlugin extends PluginPlugin {
	get register() {
		return {
			'breakLine': BreakLine
		}
	}

	parse(element, builder) {
		if (isElementBr(element)) {
			return builder.create('breakLine')
		}
	}

	parseJson(element, builder) {
		if (element.type === 'breakLine') {
			return builder.create('breakLine')
		}
	}

	parseTreeElement(element, builder) {
		if (element.type === 'br') {
			return builder.create('breakLine')
		}
	}
}
