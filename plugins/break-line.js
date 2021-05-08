const InlineWidget = require('../nodes/inline-widget')
const PluginPlugin = require('./plugin')
const createElement = require('../create-element')
const Text = require('./text').Text

class BreakLine extends InlineWidget {
	constructor(core) {
		super(core, 'breakLine')

		this.setElement(createElement('br'))
	}

	split() {
		const head = new Text(this.core, '', {})

		this.preconnect(head)

		return {
			head,
			tail: this
		}
	}
}

class BreakLinePlugin extends PluginPlugin {
	parse(element, parse, context) {
		if (element.nodeType === 1 && element.nodeName.toLowerCase() === 'br') {
			return new BreakLine(this.core)
		}

		return false
	}
}

module.exports.BreakLinePlugin = BreakLinePlugin
module.exports.BreakLine = BreakLine
