import InlineWidget from '../nodes/inline-widget.js'
import PluginPlugin from './plugin.js'
import createElement from '../utils/create-element.js'
import isElementBr from '../utils/is-element-br.js'

class BreakLine extends InlineWidget {
	constructor() {
		super('breakLine')
	}

	render() {
		return createElement('br')
	}

	accept(node) {
		return node.isContainer || node.isInlineWidget
	}

	split() {
		return {
			head: this.previous,
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
}
