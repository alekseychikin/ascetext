const Node = require('./node')

class Group extends Node {
	constructor(type) {
		super(type)

		this.isGroup = true
	}
}

module.exports = Group
