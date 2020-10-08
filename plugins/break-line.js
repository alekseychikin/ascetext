import InlineWidget from '../nodes/inline-widget'
import PluginPlugin from './plugin'
import createElement from '../create-element'

export class BreakLine extends InlineWidget {
	constructor() {
		super('breakLine')

		this.setElement(createElement('br'))
	}

	split() {
		return this
	}
}

export default class BreakLinePlugin extends PluginPlugin {
	parse(element, parse, context) {
		if (element.nodeType === 1 && element.nodeName.toLowerCase() === 'br') {
			return new BreakLine()
		}

		return false
	}
}
