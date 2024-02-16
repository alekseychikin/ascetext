import isHtmlElement from '../utils/is-html-element.js'
import isTextElement from '../utils/is-text-element.js'

export default class DOMHost {
	constructor(node) {
		this.node = node
	}

	getVirtualTree(node) {
		const body = []
		let current = node
		let type

		while (current) {
			type = isHtmlElement(current)
				? current.nodeName.toLowerCase()
				: isTextElement(current)
					? 'text'
					: null

			if (type) {
				body.push({
					type,
					attributes: this.getAttributes(current, type),
					body: current.childNodes ? this.getVirtualTree(current.firstChild) : []
				})
			}

			current = current.nextSibling
		}

		return body
	}

	getAttributes(current, type) {
		let attributes = {}
		let i

		if (type === 'text') {
			return {
				content: current.nodeValue
			}
		}

		for (i = 0; i < current.attributes.length; i++) {
			attributes[current.attributes[i].nodeName.toLowerCase()] = current.attributes[i].nodeValue
		}

		return attributes
	}
}
