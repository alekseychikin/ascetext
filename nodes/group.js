import Node from './node'

export default class Group extends Node {
	constructor(type) {
		super(type)

		this.isGroup = true
	}
}
