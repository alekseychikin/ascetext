import Node from './node'

export default class Section extends Node {
	constructor(type) {
		super(type)

		this.isSection = true
	}
}
