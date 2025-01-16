import Node from './node.js'

export default class InlineWidget extends Node {
	constructor(type, attributes = {}) {
		super(type, attributes)

		this.isInlineWidget = true
	}

	fit(node) {
		return node.isContainer || node.isInlineWidget
	}

	accept(node) {
		return node.type === 'text' || node.isInlineWidget
	}

	accommodate(node) {
		return node.isSection
	}
}
