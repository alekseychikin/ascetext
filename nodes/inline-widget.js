import Node from './node.js'

export default class InlineWidget extends Node {
	constructor(type, attributes = {}) {
		super(type, attributes)

		this.isInlineWidget = true
	}

	accept(node) {
		return node.type === 'text'
	}

	wrapper(builder) {
		return builder.createBlock()
	}
}
