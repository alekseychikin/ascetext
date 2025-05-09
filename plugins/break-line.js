import InlineWidget from '../nodes/inline-widget.js'
import PluginPlugin from './plugin.js'

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
		if (this.previous) {
			return {
				head: this.previous,
				tail: this
			}
		}

		const text = builder.create('text', { content: '' })

		builder.append(this.parent, text, this)

		return {
			head: text,
			tail: this
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

	parseJson(element, builder) {
		if (element.type === 'breakLine') {
			return builder.create('breakLine')
		}
	}

	parseTree(element, builder) {
		if (element.type === 'br') {
			return builder.create('breakLine')
		}
	}
}
