import Node from './node'

export default class Group extends Node {
	constructor(type, params = {}) {
		super(type, params)

		this.isGroup = true
	}
}
