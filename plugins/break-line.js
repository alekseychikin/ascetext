const InlineWidget = require('../nodes/inline-widget')
const PluginPlugin = require('./plugin')
const createElement = require('../create-element')

class BreakLine extends InlineWidget {
	constructor(core) {
		super(core, 'breakLine')

		this.setElement(createElement('br'))
	}

	split() {
		return this
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
