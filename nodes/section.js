const Node = require('./node')

class Section extends Node {
	constructor(core, type) {
		super(core, type)

		this.isSection = true
	}
}

module.exports = Section
