const InlineWidget = require('../nodes/inline-widget')
const PluginPlugin = require('./plugin')
const createElement = require('../core/create-element')
const Text = require('./text').Text

class BreakLine extends InlineWidget {
	constructor() {
		super('breakLine')

		this.setElement(createElement('br'))
	}

	split(offset, builder) {
		const head = builder.create('text')

		builder.preconnect(this, head)

		return {
			head,
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
		if (element.nodeType === 1 && element.nodeName.toLowerCase() === 'br') {
			return new BreakLine()
		}

		return false
	}
}

module.exports.BreakLinePlugin = BreakLinePlugin
