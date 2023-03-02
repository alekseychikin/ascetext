import Node from './node.js'

export default class Fragment extends Node {
	constructor() {
		super('fragment')

		this.isFragment = true
		this.setElement(new DocumentFragment())
	}

	accept() {
		return true
	}
}
