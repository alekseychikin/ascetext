import Node from './node.js'

export default class InlineWidget extends Node {
	constructor(type, attributes = {}, params = {}) {
		super(type, attributes, params)

		this.isInlineWidget = true
	}
}
