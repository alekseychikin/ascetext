import InlineWidget from '../nodes/inline-widget'
import PluginPlugin from './plugin'
import createElement from '../utils/create-element'
import isElementBr from '../utils/is-element-br'

class BreakLine extends InlineWidget {
	constructor() {
		super('breakLine')

		this.setElement(createElement('br'))
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
}

export default class BreakLinePlugin extends PluginPlugin {
	create() {
		return new BreakLine()
	}

	parse(element) {
		if (isElementBr(element)) {
			return new BreakLine()
		}

		return false
	}
}
