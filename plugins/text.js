import Node from '../nodes/node.js'
import PluginPlugin from './plugin.js'
import isElementBr from '../utils/is-element-br.js'
import isTextElement from '../utils/is-text-element.js'
import isHtmlElement from '../utils/is-html-element.js'

const mapModifierToTag = {
	bold: 'strong',
	italic: 'em',
	strike: 's',
	underlined: 'u'
}

export class Text extends Node {
	constructor(attributes = {}, content = '') {
		super('text', attributes)

		this.content = content
	}

	render() {
		return this.create(this.generateModifiers())
	}

	update() {
		const element = this.render()

		this.element.parentNode.insertBefore(element, this.element)
		this.element.parentNode.removeChild(this.element)
		this.setElement(element)
	}

	create(modifiers) {
		let modifier

		if (modifier = modifiers.shift()) {
			const node = document.createElement(mapModifierToTag[modifier])

			node.appendChild(this.create(modifiers))

			return node
		}

		return document.createTextNode(this.content)
	}

	generateModifiers() {
		const modifiers = []

		if (this.attributes.weight) {
			modifiers.push('bold')
		}

		if (this.attributes.style) {
			modifiers.push('italic')
		}

		if (this.attributes.decoration) {
			modifiers.push('underlined')
		}

		if (this.attributes.strike) {
			modifiers.push('strike')
		}

		return modifiers
	}

	accept() {
		return false
	}

	normalize(target, builder) {
		if (target.type === 'text' && this.isEqual(target)) {
			return builder.create('text', { ...this.attributes }, this.content + target.content)
		}

		return false
	}

	isEqual(target) {
		const fields = [ 'weight', 'style', 'decoration', 'strike' ]
		let areEqualElements = true

		fields.forEach((field) => {
			if (this.attributes[field] !== target.attributes[field]) {
				areEqualElements = false
			}
		})

		return areEqualElements
	}

	split(position, builder) {
		if (!position) {
			return {
				head: this.previous,
				tail: this
			}
		} else if (position > this.content.length - 1) {
			return {
				head: this,
				tail: this.next
			}
		}

		const head = builder.create('text', { ...this.attributes }, this.content.substr(0, position))
		const tail = builder.create('text', { ...this.attributes }, this.content.substr(position))
		const fragment = builder.createFragment()

		builder.append(fragment, head)
		builder.append(fragment, tail)
		builder.replace(this, fragment)

		return {
			head,
			tail
		}
	}

	stringify() {
		return this.stringifyWithModifiers(this.generateModifiers())
	}

	stringifyWithModifiers(modifiers) {
		let modifier

		if (modifier = modifiers.shift()) {
			return '<' + mapModifierToTag[modifier] + '>' + this.stringifyWithModifiers(modifiers) + '</' + mapModifierToTag[modifier] + '>'
		}

		return this.content.replace(/\u00A0/, '&nbsp;')
	}

	json() {
		return {
			type: this.type,
			modifiers: this.generateModifiers(),
			content: this.content
		}
	}
}

export default class TextPlugin extends PluginPlugin {
	constructor(params = {}) {
		super()

		this.params = Object.assign({
			allowModifiers: ['bold', 'italic', 'underlined', 'strike']
		}, params)
		this.supportTags = this.params.allowModifiers.map((modifier) => mapModifierToTag[modifier])
	}

	get icons() {
		return {
			bold: '<svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 11a1 1 0 1 0 0 2v-2Zm0 8H7a1 1 0 0 0 1 1v-1ZM8 5V4a1 1 0 0 0-1 1h1Zm0 8h5.5v-2H8v2Zm5.5 5H8v2h5.5v-2Zm2.5-2.5a2.5 2.5 0 0 1-2.5 2.5v2a4.5 4.5 0 0 0 4.5-4.5h-2ZM13.5 13a2.5 2.5 0 0 1 2.5 2.5h2a4.5 4.5 0 0 0-4.5-4.5v2ZM8 6h4.5V4H8v2Zm4.5 5H8v2h4.5v-2ZM15 8.5a2.5 2.5 0 0 1-2.5 2.5v2A4.5 4.5 0 0 0 17 8.5h-2ZM12.5 6A2.5 2.5 0 0 1 15 8.5h2A4.5 4.5 0 0 0 12.5 4v2ZM7 5v14h2V5H7Z" fill="currentColor"/></svg>',
			italic: '<svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 19h4m0-14h4m-6 14 4-14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			underlined: '<svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 19h12M8 5v6a4 4 0 0 0 8 0V5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			strike: '<svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c.896 0 1.775.192 2.546.557.348.165.668.362.955.586.347.273.645.586.882.93.43.628.643 1.337.615 2.053-.028.716-.296 1.412-.776 2.017-.48.605-1.154 1.096-1.952 1.421a6.073 6.073 0 0 1-2.583.428 5.865 5.865 0 0 1-2.497-.684c-.74-.402-1.332-.957-1.713-1.605M4 12h16m-3.476-5.703c-.381-.648-.973-1.203-1.714-1.605a5.866 5.866 0 0 0-2.496-.684 6.075 6.075 0 0 0-2.584.428c-.798.325-1.472.816-1.952 1.42-.48.606-.747 1.302-.776 2.018-.008.21.005.42.037.626" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
		}
	}

	create(params, text) {
		return new Text(params, text)
	}

	parse(element, builder, children) {
		const tagName = isHtmlElement(element) && element.nodeName.toLowerCase()

		if (!isTextElement(element) && (tagName && !this.supportTags.includes(tagName) && tagName !== 'span')) {
			return null
		}

		if (isTextElement(element)) {
			const firstChild = element.parentNode.firstChild
			const lastChild = element.parentNode.lastChild
			let content = element.nodeValue

			if (element === firstChild || element.previousSibling && isElementBr(element.previousSibling)) {
				content = content.replace(/^[^\S\u00A0]+/, '')
			}

			if (element === lastChild || element.nextSibling && isElementBr(element.nextSibling)) {
				content = content.replace(/[^\S\u00A0]+$/, '')
			}

			content = content.replace(/[^\S\u00A0]+/g, ' ')

			if (!content.length || content.match(/^[^\S\u00A0]+$/)) {
				return false
			}

			return builder.create('text', {}, content)
		}

		if (tagName === 'strong' && children && this.params.allowModifiers.includes('bold')) {
			builder.setAttribute(children.first, 'weight', 'bold')
		}

		if (tagName === 'em' && children && this.params.allowModifiers.includes('italic')) {
			builder.setAttribute(children.first, 'style', 'italic')
		}

		if (tagName === 's' && children && this.params.allowModifiers.includes('horizontal')) {
			builder.setAttribute(children.first, 'strike', 'horizontal')
		}

		if (tagName === 'u' && children && this.params.allowModifiers.includes('underlined')) {
			builder.setAttribute(children.first, 'decoration', 'underlined')
		}

		if (tagName === 'span') {
			if (
				children && (
					element.style['font-weight'] === 'bold' ||
					element.style['font-weight'] === '600' ||
					element.style['font-weight'] === '500' ||
					element.style['font-weight'] === '700'
				) && this.params.allowModifiers.includes('bold')
			) {
				builder.setAttribute(children.first, 'weight', 'bold')
			}

			if (element.style['font-style'] === 'italic' && this.params.allowModifiers.includes('italic')) {
				builder.setAttribute(children.first, 'style', 'italic')
			}

			if (element.style['text-decoration'] === 'line-through' && this.params.allowModifiers.includes('strike')) {
				builder.setAttribute(children.first, 'strike', 'horizontal')
			}

			if (element.style['text-decoration'] === 'underline' && this.params.allowModifiers.includes('underline')) {
				builder.setAttribute(children.first, 'decoration', 'underlined')
			}
		}
	}

	parseJson(element, builder) {
		if (element.type === 'text') {
			const attributes = {}

			if (element.modifiers.includes('bold')) {
				attributes.weight = 'bold'
			}

			if (element.modifiers.includes('italic')) {
				attributes.style = 'italic'
			}

			if (element.modifiers.includes('underlined')) {
				attributes.decoration = 'underlined'
			}

			if (element.modifiers.includes('strike')) {
				attributes.strike = 'horizontal'
			}

			return builder.create('text', attributes, element.content)
		}
	}

	getSelectControls(focusedNodes, isRange) {
		let hasBold = false
		let hasItalic = false
		let hasDecoration = false
		let hasStrike = false
		const controls = []

		if (!isRange) {
			return []
		}

		focusedNodes.forEach((item) => {
			if (item.type === 'text' && item.attributes.weight === 'bold') {
				hasBold = true
			}

			if (item.type === 'text' && item.attributes.style === 'italic') {
				hasItalic = true
			}

			if (item.type === 'text' && item.attributes.decoration === 'underlined') {
				hasDecoration = true
			}

			if (item.type === 'text' && item.attributes.strike === 'horizontal') {
				hasStrike = true
			}
		})

		if (this.params.allowModifiers.includes('bold')) {
			if (hasBold) {
				controls.push({
					label: 'Сделать нежирным',
					icon: 'bold',
					selected: () => true,
					action: this.unsetBold
				})
			} else {
				controls.push({
					label: 'Сделать жирным',
					icon: 'bold',
					action: this.setBold
				})
			}
		}

		if (this.params.allowModifiers.includes('italic')) {
			if (hasItalic) {
				controls.push({
					label: 'Сделать некурсивом',
					icon: 'italic',
					selected: () => true,
					action: this.unsetItalic
				})
			} else {
				controls.push({
					label: 'Сделать курсивом',
					icon: 'italic',
					action: this.setItalic
				})
			}
		}

		if (this.params.allowModifiers.includes('underlined')) {
			if (hasDecoration) {
				controls.push({
					label: 'Сделать неподчёркнутым',
					icon: 'underlined',
					selected: () => true,
					action: this.unsetUnderline
				})
			} else {
				controls.push({
					label: 'Сделать подчёркнутым',
					icon: 'underlined',
					action: this.setUnderline
				})
			}
		}

		if (this.params.allowModifiers.includes('strike')) {
			if (hasStrike) {
				controls.push({
					label: 'Сделать незачёркнутым',
					icon: 'strike',
					selected: () => true,
					action: this.unsetStrike
				})
			} else {
				controls.push({
					label: 'Сделать зачёркнутым',
					icon: 'strike',
					action: this.setStrike
				})
			}
		}

		return controls
	}

	unsetBold(event, { builder, getSelectedItems }) {
		getSelectedItems().forEach((item) => {
			if (item.type === 'text' && item.attributes.weight === 'bold') {
				builder.setAttribute(item, 'weight', '')
			}
		})
	}

	setBold(event, { builder, getSelectedItems }) {
		getSelectedItems().forEach((item) => {
			if (item.type === 'text') {
				builder.setAttribute(item, 'weight', 'bold')
			}
		})
	}

	unsetItalic(event, { builder, getSelectedItems }) {
		const selectedItems = getSelectedItems()

		selectedItems.forEach((item) => {
			if (item.type === 'text' && item.attributes.style === 'italic') {
				builder.setAttribute(item, 'style', '')
			}
		})
	}

	setItalic(event, { builder, getSelectedItems }) {
		getSelectedItems().forEach((item) => {
			if (item.type === 'text') {
				builder.setAttribute(item, 'style', 'italic')
			}
		})
	}

	unsetStrike(event, { builder, getSelectedItems }) {
		const selectedItems = getSelectedItems()

		selectedItems.forEach((item) => {
			if (item.type === 'text' && item.attributes.strike === 'horizontal') {
				builder.setAttribute(item, 'strike', '')
			}
		})
	}

	setStrike(event, { builder, getSelectedItems }) {
		getSelectedItems().forEach((item) => {
			if (item.type === 'text') {
				builder.setAttribute(item, 'strike', 'horizontal')
			}
		})
	}

	unsetUnderline(event, { builder, getSelectedItems }) {
		const selectedItems = getSelectedItems()

		selectedItems.forEach((item) => {
			if (item.type === 'text' && item.attributes.decoration === 'underlined') {
				builder.setAttribute(item, 'decoration', '')
			}
		})
	}

	setUnderline(event, { builder, getSelectedItems }) {
		getSelectedItems().forEach((item) => {
			if (item.type === 'text') {
				builder.setAttribute(item, 'decoration', 'underlined')
			}
		})
	}
}
