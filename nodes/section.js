const Node = require('./node')

class Section extends Node {
	constructor(type) {
		super(type)

		this.isSection = true
	}
}

module.exports = Section
