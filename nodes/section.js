import Node from './node'

export default class Section extends Node {
	constructor(type) {
		super(type)

		this.isSection = true
	}

	append(node, last, { builder, appendDefault }) {
		if (node.type === 'text' || node.isInlineWidget || node.type === 'breakLine') {
			const container = builder.createBlock()

			builder.append(container, node, last)
		} else {
			appendDefault(this, node, last)
		}
	}

	accept(node) {
		return node.type === 'root'
	}
}
