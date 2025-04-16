import Node from './node.js'

export default class Fragment extends Node {
	constructor() {
		super('fragment')

		this.isFragment = true
	}

	json(body = []) {
		return body
	}
}
