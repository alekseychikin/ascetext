import Node from './node'

export default class Fragment extends Node {
	constructor() {
		super('fragment')

		this.isFragment = true
		this.setElement(new DocumentFragment())
	}
}
