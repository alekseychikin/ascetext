const Node = require('./node')

class Group extends Node {
	constructor(core, type) {
		super(core, type)

		this.isGroup = true
	}
}

module.exports = Group
