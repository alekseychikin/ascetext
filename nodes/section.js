import Node from './node'

export default class Section extends Node {
	constructor(type) {
		super(type)

		this.isSection = true
	}

	append(node, anchor, { builder, appendDefault }) {
		if (node.type === 'text' || node.isInlineWidget || node.type === 'breakLine') {
			const container = builder.createBlock()

			builder.append(container, node, anchor)
		} else {
			appendDefault(this, node, anchor)
		}
	}

	accept(node) {
		return node.type === 'root'
	}
}
