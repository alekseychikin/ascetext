import { getNodeByElement } from '../utils/map-element-to-node.js'
import isHtmlElement from '../utils/is-html-element.js'
import isTextElement from '../utils/is-text-element.js'
import isElementBr from '../utils/is-element-br.js'
import walk from '../utils/walk.js'

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
const containerElements = [
	'address',
	'blockquote',
	'dd',
	'dt',
	'figcaption',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'header',
	'p',
	'pre'
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
const beginSpacesRegexp = /^[^\S\u00A0]+/
const finishSpacesRegexp = /[^\S\u00A0]+$/
const groupSpacesRegexp = /[^\S\u00A0]+/g
const trailingBrs = []
const mapModifierToTag = {
	bold: 'strong',
	italic: 'em',
	strike: 's',
	underlined: 'u'
}
const supportTags = {
	bold: ['strong', 'b'],
	italic: ['em', 'i'],
	strike: 's',
	underlined: 'u'
}

function isTextTag(element) {
	return element.nodeType === 1 && textElements.includes(element.nodeName.toLowerCase())
}

export default class DOMHost {
	constructor(node) {
		this.node = node

		this.createElement = this.createElement.bind(this)
		this.focus = this.focus.bind(this)
		this.selectionChange = this.selectionChange.bind(this)
		this.selectionHandlers = []
		this.selectionTimeout = null
		this.skipFocus = false
		this.components = []
		document.addEventListener('focus', this.focus, true)
		document.addEventListener('selectionchange', this.selectionChange)
	}

	setComponents(components) {
		this.components = components
	}

	getVirtualTree(node) {
		let body = []
		let current = node
		let type
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

		return body
	}

	getHtmlElement(current) {
		if (isElementBr(current) && trailingBrs.includes(current)) {
			return null
		}

		return [{
			type: current.nodeName.toLowerCase(),
			attributes: this.getAttributes(current),
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

	getAttributes(current) {
		let attributes = {}
		let i

		for (i = 0; i < current.attributes.length; i++) {
			attributes[current.attributes[i].nodeName.toLowerCase()] = current.attributes[i].nodeValue
		}

		return attributes
	}

	// добавить lookahead
	createElement(tree) {
		if (tree.type === 'text') {
			return this.createText(tree, this.generateModifiers(tree))
		}

		const node = document.createElement(tree.type)
		let attributeName

		for (attributeName in tree.attributes) {
			node.setAttribute(attributeName, tree.attributes[attributeName])
		}

		tree.body.map(this.createElement).forEach((child) => node.appendChild(child))

		if ((containerElements.includes(tree.type) || typeof tree.attributes.tabIndex !== 'undefined') && !node.childNodes.length) {
			node.appendChild(this.getTrailingBr())
		}

		return node
	}

	// TODO: вызвать this.createElement с лукахедом в виде node.element
	// нужно сделать создание по аналогии того, что я делал gutt-browser-stringifier
	update(node) {
		const element = this.createElement(node.render())
		let current = node.first

		while (current) {
			element.appendChild(current.element)
			current = current.next
		}

		node.element.parentNode.insertBefore(element, node.element)
		node.element.parentNode.removeChild(node.element)
		node.setElement(element)
	}

	createText(tree, modifiers) {
		let modifier

		if (modifier = modifiers.shift()) {
			const node = document.createElement(mapModifierToTag[modifier])

			node.appendChild(this.createText(tree, modifiers))

			return node
		}

		return document.createTextNode(tree.attributes.content)
	}

	generateModifiers(element) {
		const modifiers = []

		if (element.attributes.weight) {
			modifiers.push('bold')
		}

		if (element.attributes.style) {
			modifiers.push('italic')
		}

		if (element.attributes.decoration) {
			modifiers.push('underlined')
		}

		if (element.attributes.strike) {
			modifiers.push('strike')
		}

		return modifiers
	}

	remove(current) {
		if (current.element && current.element.parentNode) {
			const parent = current.element.parentNode

			parent.removeChild(current.element)

			if (containerElements.includes(parent.nodeName.toLowerCase()) && !parent.childNodes.length) {
				parent.appendChild(this.getTrailingBr())
			}
		}
	}

	append(node, target, anchor) {
		const lastChild = node.element.lastChild
		const trailingIndex = lastChild && isElementBr(lastChild) ? trailingBrs.indexOf(lastChild) : -1

		if (!anchor && trailingIndex >= 0) {
			trailingBrs.splice(trailingIndex, 1)
			node.element.removeChild(lastChild)
		}

		node.element.insertBefore(target.element, anchor ? anchor.element : null)

		if (!anchor && isElementBr(target.element)) {
			node.element.appendChild(this.getTrailingBr())
		}
	}

	getTrailingBr() {
		const trailingBr = document.createElement('br')

		trailingBr.setAttribute('data-trailing', '')
		trailingBrs.push(trailingBr)

		return trailingBr
	}

	focus(event) {
		if (!this.skipFocus) {
			cancelAnimationFrame(this.selectionTimeout)
			this.selectionTimeout = requestAnimationFrame(() => {
				const selectedComponent = this.components.find((component) => component.checkSelection(event.srcElement))

				this.selectionUpdate({
					anchorNode: event.srcElement,
					focusNode: event.srcElement,
					anchorOffset: 0,
					focusOffset: 0,
					isCollapsed: true,
					selectedComponent: Boolean(selectedComponent)
				})
			}, 1)
		}
	}

	selectionChange(event) {
		cancelAnimationFrame(this.selectionTimeout)
		this.selectionTimeout = requestAnimationFrame(() => {
			const selection = document.getSelection()
			const selectedComponent = this.components.find((component) => component.checkSelection(selection.anchorNode))

			this.selectionUpdate({
				anchorNode: selection.anchorNode,
				focusNode: selection.focusNode,
				anchorOffset: selection.anchorOffset,
				focusOffset: selection.focusOffset,
				isCollapsed: selection.isCollapsed,
				selectedComponent: Boolean(selectedComponent)
			})
		}, 1)
		this.skipFocus = true
		setTimeout(() => (this.skipFocus = false), 50)
	}

	selectionUpdate(event) {
		this.selectionHandlers.forEach((handler) => handler(event))
	}

	onSelectionChange(handler) {
		this.selectionHandlers.push(handler)
	}

	getChildByOffset(target, offset) {
		let restOffset = Math.min(offset, target.length)

		if (target.isWidget && !offset) {
			return { node: target, element: target.element }
		}

		const element = walk(target.element, (current) => {
			if (isTextElement(current)) {
				if (current.length >= restOffset) {
					return current
				}

				restOffset -= current.length
			} else if (isElementBr(current)) {
				if (restOffset === 0) {
					return current
				}

				restOffset -= 1
			}
		})
		const node = getNodeByElement(element)

		return { node, element }
	}

	getOffset(target, element) {
		let index = 0

		if (target.isWidget) {
			return 0
		}

		walk(target.element, (current) => {
			if (current === element) {
				return true
			}

			if (isTextElement(current)) {
				index += current.length
			} else if (isElementBr(current)) {
				if (current === target.element.lastChild) {
					return true
				}

				index += 1
			}
		})

		return index
	}
}
