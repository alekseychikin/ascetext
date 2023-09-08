import Node from './node.js'

export default class Section extends Node {
	constructor(type) {
		super(type)

		this.isSection = true
	}

	accept(node) {
		return node.isWidget || node.isContainer || node.isGroup
	}
}
