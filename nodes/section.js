import Node from './node.js'

export default class Section extends Node {
	constructor(type, attributes = {}, params = {}) {
		super(type, attributes, params)

		this.isSection = true
		this.layout = 'vertical'
	}
}
