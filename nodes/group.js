const Node = require('./node')

class Group extends Node {
	constructor(type, params = {}) {
		super(type, params)

		this.isGroup = true
	}
}

module.exports = Group
