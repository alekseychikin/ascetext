const InlineWidget = require('../nodes/inline-widget')
const PluginPlugin = require('./plugin')
const createElement = require('../create-element')
const Text = require('./text').Text

class BreakLine extends InlineWidget {
	constructor() {
		super('breakLine')

		this.setElement(createElement('br'))
	}

	split() {
		const head = new Text('', {})

		this.preconnect(head)

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
	parse(element) {
		if (element.nodeType === 1 && element.nodeName.toLowerCase() === 'br') {
			return new BreakLine()
		}

		return false
	}
}

module.exports.BreakLinePlugin = BreakLinePlugin
module.exports.BreakLine = BreakLine
