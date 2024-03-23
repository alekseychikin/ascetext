import Node from './node.js'

export default class Section extends Node {
	constructor(type, attributes = {}) {
		super(type, attributes)

		this.isSection = true
	}

	accept(node) {
		return node.isWidget || node.isContainer || node.isGroup || node.isSection
	}
}
