import isHtmlElement from '../utils/is-html-element.js'
import isTextElement from '../utils/is-text-element.js'
import isElementBr from '../utils/is-element-br.js'
import getAttributes from '../utils/get-attributes.js'

const textElements = [
	'em',
	'i',
	'strong',
	'b',
	'span',
	's',
	'u'
]
const supportTags = {
	bold: ['strong', 'b'],
	italic: ['em', 'i'],
	strike: 's',
	underlined: 'u'
}
const ignoreParsingElements = ['style', 'script']

function isTextTag(element) {
	return element.nodeType === 1 && textElements.includes(element.nodeName.toLowerCase())
}

export default class Parser {
	constructor(root) {
		this.root = root
	}

	getVirtualTree(node) {
		let body = []
		let current = node
		let elements = null

		while (current) {
			elements = null

			if (isTextElement(current) || isTextTag(current)) {
				elements = this.getTextElement(current)
			} else if (isHtmlElement(current)) {
				elements = this.getHtmlElement(current)
			}

			if (elements) {
				body = body.concat(elements)
			}

			current = current.nextSibling
		}

		return this.normalize(this.removeTrailingBr(body.filter(Boolean)))
	}

	removeTrailingBr(body) {
		if (body.length > 0 && body[body.length - 1].type === 'br') {
			if (body.length > 1 && body[body.length - 2].type === 'text') {
				body[body.length - 2].attributes.content += '\u00A0'
			}

			return body.slice(0, body.length - 1)
		}

		return body
	}

	normalize(tree) {
		let i
		let current
		let next

		for (i = 0; i < tree.length - 1; i++) {
			current = tree[i]
			next = tree[i + 1]

			if (current.type === next.type) {
				switch (current.type) {
					case 'a':
						if (this.isEqualAttributes(current, next, ['href', 'target'])) {
							current.body = this.normalize(current.body.concat(next.body))
							tree.splice(i + 1, 1)
							i--
						}

						break
					case 'text':
						if (this.isEqualAttributes(current, next, ['weight', 'style', 'strike', 'decoration'])) {
							current.attributes.content += next.attributes.content
							tree.splice(i + 1, 1)
							i--
						}

						break
				}
			}
		}

		return tree
	}

	isEqualAttributes(left, right, attributes) {
		let equal = true

		attributes.forEach((attribute) => {
			if (left.attributes[attribute] !== right.attributes[attribute]) {
				equal = false
			}
		})

		return equal
	}

	getHtmlElement(current) {
		if (ignoreParsingElements.includes(current.nodeName.toLowerCase())) {
			return null
		}

		return [{
			type: current.nodeName.toLowerCase(),
			attributes: getAttributes(current),
			body: this.getVirtualTree(current.firstChild)
		}]
	}

	getTextElement(current, context = {}) {
		if (isElementBr(current)) {
			return this.getHtmlElement(current)
		}

		if (isHtmlElement(current)) {
			const tagName = current.nodeName.toLowerCase()

			if (supportTags.bold.includes(tagName)) {
				context.weight = 'bold'
			}

			if (supportTags.italic.includes(tagName)) {
				context.style = 'italic'
			}

			if (supportTags.strike === tagName) {
				context.strike = 'horizontal'
			}

			if (supportTags.underlined === tagName) {
				context.decoration = 'underlined'
			}

			if (tagName === 'span') {
				if (
					(
						current.style['font-weight'] === 'bold' ||
						current.style['font-weight'] === '600' ||
						current.style['font-weight'] === '500' ||
						current.style['font-weight'] === '700'
					)
				) {
					context.weight = 'bold'
				}

				if (current.style['font-style'] === 'italic') {
					context.style = 'italic'
				}

				if (current.style['text-decoration'].split(' ').includes('line-through')) {
					context.strike = 'horizontal'
				}

				if (current.style['text-decoration'].split(' ').includes('underline')) {
					context.decoration = 'underlined'
				}
			}

			let children = []
			let i

			for (i = 0; i < current.childNodes.length; i++) {
				children = children.concat(this.getTextElement(current.childNodes[i], { ...context }))
			}

			return children
		}

		return {
			type: 'text',
			attributes: {
				content: current.nodeValue,
				...context
			},
			body: []
		}
	}

	isInsideEditor(element) {
		let current = element

		while (current) {
			if (current === this.root) {
				return true
			}

			current = current.parentNode
		}

		return false
	}
}
