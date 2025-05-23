import Node from '../nodes/node.js'
import PluginPlugin from './plugin.js'
import findLastNode from '../utils/find-last.js'

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

export class Text extends Node {
	constructor(attributes) {
		super('text', attributes)

		this.length = attributes.content.length
	}

	render() {
		return {
			type: 'text',
			attributes: { ...this.attributes },
			body: []
		}
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

	split(builder, position) {
		const text = builder.create('text', { content: '' })

		if (!position) {
			if (this.previous) {
				return {
					head: this.previous,
					tail: this
				}
			}

			builder.append(this.parent, text, this)

			return {
				head: text,
				tail: this
			}
		}

		if (position === this.length) {
			if (this.next) {
				return {
					head: this,
					tail: this.next
				}
			}

			builder.append(this.parent, text)

			return {
				head: this,
				tail: text
			}
		}

		let left = this.attributes.content.substr(0, position)
		let right = this.attributes.content.substr(position)

		if (left[left.length - 1] === ' ') {
			left = left.substr(0, left.length - 1) + '\u00a0'
		}

		if (right[0] === ' ') {
			right = '\u00a0' + right.substr(1)
		}

		const head = builder.create('text', { ...this.attributes, content: left })
		const tail = builder.create('text', { ...this.attributes, content: right })
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

		return this.attributes.content.replace(/\u00A0/, '&nbsp;')
	}

	json() {
		return {
			type: this.type,
			modifiers: this.generateModifiers(),
			content: this.attributes.content
		}
	}
}

export default class TextPlugin extends PluginPlugin {
	get register() {
		return {
			'text': Text
		}
	}

	constructor(params = {}) {
		super()

		this.params = Object.assign({
			allowModifiers: ['bold', 'italic', 'underlined', 'strike']
		}, params)
		this.supportTags = this.params.allowModifiers.reduce((result, modifier) => {
			if (typeof supportTags[modifier] === 'string') {
				result.push(supportTags[modifier])
			} else {
				result = result.concat(supportTags[modifier])
			}

			return result
		}, [])
		this.normalize = this.normalize.bind(this)
	}

	get icons() {
		return {
			bold: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 11a1 1 0 1 0 0 2v-2Zm0 8H7a1 1 0 0 0 1 1v-1ZM8 5V4a1 1 0 0 0-1 1h1Zm0 8h5.5v-2H8v2Zm5.5 5H8v2h5.5v-2Zm2.5-2.5a2.5 2.5 0 0 1-2.5 2.5v2a4.5 4.5 0 0 0 4.5-4.5h-2ZM13.5 13a2.5 2.5 0 0 1 2.5 2.5h2a4.5 4.5 0 0 0-4.5-4.5v2ZM8 6h4.5V4H8v2Zm4.5 5H8v2h4.5v-2ZM15 8.5a2.5 2.5 0 0 1-2.5 2.5v2A4.5 4.5 0 0 0 17 8.5h-2ZM12.5 6A2.5 2.5 0 0 1 15 8.5h2A4.5 4.5 0 0 0 12.5 4v2ZM7 5v14h2V5H7Z" fill="currentColor"/></svg>',
			italic: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 19h4m0-14h4m-6 14 4-14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			underlined: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 19h12M8 5v6a4 4 0 0 0 8 0V5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			strike: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c.896 0 1.775.192 2.546.557.348.165.668.362.955.586.347.273.645.586.882.93.43.628.643 1.337.615 2.053-.028.716-.296 1.412-.776 2.017-.48.605-1.154 1.096-1.952 1.421a6.073 6.073 0 0 1-2.583.428 5.865 5.865 0 0 1-2.497-.684c-.74-.402-1.332-.957-1.713-1.605M4 12h16m-3.476-5.703c-.381-.648-.973-1.203-1.714-1.605a5.866 5.866 0 0 0-2.496-.684 6.075 6.075 0 0 0-2.584.428c-.798.325-1.472.816-1.952 1.42-.48.606-.747 1.302-.776 2.018-.008.21.005.42.037.626" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
		}
	}

	get autocompleteRule() {
		return /((\*\*)[^*]+\*\*|(__)[^_]+__|(\*)[^*]+\*|(~~)[^~]+~~)(\s*)?$/
	}

	get autocompleteTrigger() {
		return /^[ ]$/
	}

	autocomplete(match, builder, selection) {
		if (
			(match[2] || match[3]) && this.params.allowModifiers.includes('bold') ||
			match[4] && this.params.allowModifiers.includes('italic') ||
			match[5] && this.params.allowModifiers.includes('strike')
		) {
			const spaceLength = match[6] ? match[6].length : 0
			const entity = match[2] || match[3] || match[4] || match[5]
			const { tail } = builder.cutRange(
				selection.anchorContainer,
				selection.anchorOffset - match[0].length,
				selection.anchorContainer,
				selection.anchorOffset - spaceLength
			)
			const content = builder.create('text', {
				...tail.attributes,
				content: tail.attributes.content.substr(entity.length, match[0].length - entity.length * 2 - spaceLength),
				...(match[2] || match[3] ? { weight: 'bold' } : {}),
				...(match[4] ? { style: 'italic' } : {}),
				...(match[5] ? { strike: 'horizontal' } : {})
			})

			builder.replace(tail, content)
			selection.setSelection(selection.anchorContainer, selection.anchorOffset - entity.length * 2)
		}
	}

	parseTree(element, builder) {
		if (element.type !== 'text') {
			return null
		}

		const attributes = {
			content: element.attributes.content
		}

		if (element.attributes.weight && this.params.allowModifiers.includes('bold')) {
			attributes.weight = 'bold'
		}

		if (element.attributes.style && this.params.allowModifiers.includes('italic')) {
			attributes.style = 'italic'
		}

		if (element.attributes.strike && this.params.allowModifiers.includes('strike')) {
			attributes.strike = 'horizontal'
		}

		if (element.attributes.decoration && this.params.allowModifiers.includes('underlined')) {
			attributes.decoration = 'underlined'
		}

		return builder.create('text', attributes)
	}

	parseJson(element, builder) {
		if (element.type === 'text') {
			const attributes = {
				content: element.content
			}

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

			return builder.create('text', attributes)
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
					slug: 'text.unbold',
					label: 'Bold',
					shortcut: 'ctrl+b/meta+b',
					icon: 'bold',
					selected: true,
					action: this.unsetBold
				})
			} else {
				controls.push({
					slug: 'text.bold',
					label: 'Bold',
					shortcut: 'ctrl+b/meta+b',
					icon: 'bold',
					action: this.setBold
				})
			}
		}

		if (this.params.allowModifiers.includes('italic')) {
			if (hasItalic) {
				controls.push({
					slug: 'text.unitalic',
					label: 'Italic',
					shortcut: 'ctrl+i/meta+i',
					icon: 'italic',
					selected: true,
					action: this.unsetItalic
				})
			} else {
				controls.push({
					slug: 'text.italic',
					label: 'Italic',
					shortcut: 'ctrl+i/meta+i',
					icon: 'italic',
					action: this.setItalic
				})
			}
		}

		if (this.params.allowModifiers.includes('underlined')) {
			if (hasDecoration) {
				controls.push({
					slug: 'text.ununderlined',
					label: 'Underline',
					shortcut: 'ctrl+u/meta+u',
					icon: 'underlined',
					selected: true,
					action: this.unsetUnderline
				})
			} else {
				controls.push({
					slug: 'text.underlined',
					label: 'Underline',
					shortcut: 'ctrl+u/meta+u',
					icon: 'underlined',
					action: this.setUnderline
				})
			}
		}

		if (this.params.allowModifiers.includes('strike')) {
			if (hasStrike) {
				controls.push({
					slug: 'text.unstrike',
					label: 'Strike',
					shortcut: 'ctrl+s/meta+s',
					icon: 'strike',
					selected: true,
					action: this.unsetStrike
				})
			} else {
				controls.push({
					slug: 'text.strike',
					label: 'Strike',
					shortcut: 'ctrl+s/meta+s',
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

	normalize(node, builder) {
		if (node.parent.type === 'root' && (node.type === 'text' || node.isInlineWidget)) {
			const paragraph = builder.createBlock()
			const last = findLastNode(node, (item) => item.type === 'text' || item.isInlineWidget)

			builder.wrap(node, paragraph, last)

			return paragraph
		}

		if (node.type === 'text' && node.previous && node.previous.type === 'text' && (this.isEqual(node, node.previous) || !node.length || !node.previous.length)) {
			const text = builder.create('text', { ...(!node.previous.length ? node.attributes : node.previous.attributes), content: node.previous.attributes.content + node.attributes.content })

			builder.replaceUntil(node.previous, text, node)

			return text
		}

		return false
	}

	isEqual(node, target) {
		const fields = [ 'weight', 'style', 'decoration', 'strike' ]
		let areEqualElements = true

		fields.forEach((field) => {
			if (node.attributes[field] !== target.attributes[field]) {
				areEqualElements = false
			}
		})

		return areEqualElements
	}
}
