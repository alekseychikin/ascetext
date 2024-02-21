import isHtmlElement from '../utils/is-html-element.js'
import isTextElement from '../utils/is-text-element.js'

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
const beginSpacesRegexp = /^[^\S\u00A0]+/
const finishSpacesRegexp = /[^\S\u00A0]+$/
const groupSpacesRegexp = /[^\S\u00A0]+/g

export default class DOMHost {
	constructor(node) {
		this.node = node
	}

	getVirtualTree(node) {
		const body = []
		let current = node
		let type
		let element

		while (current) {
			if (isTextElement(current)) {
				element = this.getTextElement(current)
			}

			if (isHtmlElement(current)) {
				element = this.getHtmlElement(current)
			}

			if (element) {
				body.push(element)
			}

			current = current.nextSibling
		}

		return body
	}

	getHtmlElement(current) {
		const type = current.nodeName.toLowerCase()

		return {
			type,
			attributes: this.getAttributes(current),
			body: this.getVirtualTree(current.firstChild)
		}
	}

	getTextElement(current) {
		let content = current.nodeValue

		if (
			!current.previousSibling ||
			isHtmlElement(current.previousSibling) && blockElements.includes(current.previousSibling.nodeName.toLowerCase())
		) {
			content = content.replace(beginSpacesRegexp, '')
		}

		if (!current.nextSibling ||
			isHtmlElement(current.nextSibling) && blockElements.includes(current.nextSibling.nodeName.toLowerCase())
		) {
			content = content.replace(finishSpacesRegexp, '')
		}

		if (!content.length) {
			return null
		}

		return {
			type: 'text',
			attributes: {
				content
			},
			body: []
		}
	}

	getAttributes(current) {
		let attributes = {}
		let i

		for (i = 0; i < current.attributes.length; i++) {
			attributes[current.attributes[i].nodeName.toLowerCase()] = current.attributes[i].nodeValue
		}

		return attributes
	}
}
