import Node from './node.js'

export default class Group extends Node {
	constructor(type, params = {}) {
		super(type, params)

		this.isGroup = true
	}

	accept() {
		return true
	}
}
