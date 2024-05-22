import isHtmlElement from '../utils/is-html-element.js'
import isTextElement from '../utils/is-text-element.js'
import isElementBr from '../utils/is-element-br.js'
import getAttributes from '../utils/get-attributes.js'

const blockElements = [
	'br',
	'address',
	'article',
	'aside',
	'blockquote',
	'canvas',
	'dd',
	'div',
	'dl',
	'dt',
	'fieldset',
	'figcaption',
	'figure',
	'footer',
	'form',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'header',
	'hr',
	'li',
	'main',
	'nav',
	'noscript',
	'ol',
	'p',
	'pre',
	'section',
	'table',
	'tfoot',
	'ul',
	'video'
]
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
const beginSpacesRegexp = /^[^\S\u00A0]+/
const finishSpacesRegexp = /[^\S\u00A0]+$/
const groupSpacesRegexp = /[^\S\u00A0]+/g
const ignoreParsingElements = ['style', 'script']

function isTextTag(element) {
	return element.nodeType === 1 && textElements.includes(element.nodeName.toLowerCase())
}

export default class Parser {
	constructor(render) {
		this.render = render
	}

	getVirtualTree(node) {
		let body = []
		let current = node
		let elements

		while (current) {
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

		// console.log(body)
		return this.normalize(body.filter(Boolean))
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
		if (isElementBr(current) && this.render.trailingBrs.includes(current)) {
			return null
		}

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
		let content = current.nodeValue

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

		if (
			!current.previousSibling && blockElements.includes(current.parentNode.nodeName.toLowerCase()) ||
			current.previousSibling && isHtmlElement(current.previousSibling) && blockElements.includes(current.previousSibling.nodeName.toLowerCase())
		) {
			content = content.replace(beginSpacesRegexp, '')
		}

		if (!current.nextSibling && blockElements.includes(current.parentNode.nodeName.toLowerCase()) ||
			current.nextSibling && isHtmlElement(current.nextSibling) && blockElements.includes(current.nextSibling.nodeName.toLowerCase())
		) {
			content = content.replace(finishSpacesRegexp, '')
		}

		content = content.replace(groupSpacesRegexp, ' ')

		if (!content.length) {
			return null
		}

		return [{
			type: 'text',
			attributes: {
				content,
				...context
			},
			body: []
		}]
	}
}
