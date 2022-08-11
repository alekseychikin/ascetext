const InlineWidget = require('../nodes/inline-widget')
const PluginPlugin = require('./plugin')
const createElement = require('../utils/create-element')
const Text = require('./text').Text
const isElementBr = require('../utils/is-element-br').isElementBr

class BreakLine extends InlineWidget {
	constructor() {
		super('breakLine')

		this.setElement(createElement('br'))
	}

	split(offset, builder) {
		return {
			head: this.previous,
			tail: this
		}
	}

	stringify() {
		return '<br />'
	}
}

class BreakLinePlugin extends PluginPlugin {
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

module.exports.BreakLinePlugin = BreakLinePlugin
