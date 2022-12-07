import Node from '../nodes/node'
import PluginPlugin from './plugin'
import isElementBr from '../utils/is-element-br'
import isTextElement from '../utils/is-text-element'
import isHtmlElement from '../utils/is-html-element'

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
			bold: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M10.6876 5.40278C10.6876 5.64352 10.6545 5.88426 10.5882 6.125C10.5314 6.36574 10.432 6.58796 10.2901 6.79167C10.1481 6.98611 9.96349 7.16204 9.73631 7.31944C9.50913 7.46759 9.23462 7.5787 8.91278 7.65278V7.73611C9.19675 7.78241 9.46653 7.86111 9.72211 7.97222C9.97769 8.08333 10.2001 8.23611 10.3895 8.43056C10.5788 8.625 10.7255 8.86111 10.8296 9.13889C10.9432 9.41667 11 9.74537 11 10.125C11 10.625 10.8911 11.0602 10.6734 11.4306C10.4557 11.7917 10.1623 12.088 9.7931 12.3194C9.4334 12.5509 9.02164 12.7222 8.55781 12.8333C8.09398 12.9444 7.61596 13 7.12373 13C6.96281 13 6.75456 13 6.49899 13C6.25287 13 5.9831 12.9907 5.68966 12.9722C5.40568 12.963 5.11224 12.9444 4.80933 12.9167C4.51589 12.8889 4.24611 12.8472 4 12.7917V3.20833C4.17985 3.18056 4.38337 3.15278 4.61055 3.125C4.84719 3.09722 5.09804 3.07407 5.36308 3.05556C5.62813 3.03704 5.8979 3.02315 6.17241 3.01389C6.45639 3.00463 6.73563 3 7.01014 3C7.47397 3 7.9236 3.03704 8.35903 3.11111C8.80392 3.17593 9.19675 3.2963 9.53753 3.47222C9.88776 3.64815 10.167 3.89352 10.3753 4.20833C10.5835 4.52315 10.6876 4.9213 10.6876 5.40278ZM7.13793 11.4306C7.37458 11.4306 7.60176 11.4028 7.81947 11.3472C8.04665 11.2917 8.24544 11.2083 8.41582 11.0972C8.58621 10.9769 8.72346 10.8287 8.82759 10.6528C8.93171 10.4769 8.98377 10.2685 8.98377 10.0278C8.98377 9.72222 8.92224 9.48148 8.79919 9.30556C8.67613 9.12963 8.51521 8.99537 8.31643 8.90278C8.11765 8.80093 7.8952 8.73611 7.64909 8.70833C7.40298 8.68056 7.15686 8.66667 6.91075 8.66667H6C6 9 6 11 6 11.3771C6.03013 11.3816 6.06393 11.3856 6.10142 11.3889C6.20554 11.3981 6.3144 11.4074 6.42799 11.4167C6.55105 11.4167 6.6741 11.4213 6.79716 11.4306C6.92968 11.4306 7.04327 11.4306 7.13793 11.4306ZM6.49899 7.22222C6.63151 7.22222 6.78296 7.21759 6.95335 7.20833C7.1332 7.19907 7.27992 7.18519 7.39351 7.16667C7.75321 7.05556 8.06085 6.88889 8.31643 6.66667C8.58147 6.44444 8.714 6.15278 8.714 5.79167C8.714 5.55093 8.66667 5.35185 8.57201 5.19444C8.47735 5.03704 8.34956 4.91204 8.18864 4.81944C8.03719 4.72685 7.86207 4.66204 7.66329 4.625C7.4645 4.58796 7.25625 4.56944 7.03854 4.56944C6.79243 4.56944 6.56525 4.57407 6.357 4.58333C6.21644 4.58958 6.09744 4.59794 6 4.60841C6 5 5.9823 6.85673 6 7.22222H6.49899Z" fill="currentColor"/>\
</svg>',
			italic: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M6.994 6.68595V6.33595C7.62395 6.08397 8 6 8.996 5.83195L9.248 5.99995L7.99999 12H8.99999V12.364C8.59111 12.6755 8.01544 13 7.49999 13C6.49245 13 6.75943 12.0406 6.91 11.3479L7.89 6.82595L6.994 6.68595ZM8.114 3.57795C8.114 3.09261 8.44067 2.79395 8.926 2.79395C9.44867 2.79395 9.766 3.09261 9.766 3.57795C9.766 4.04461 9.44867 4.31995 8.926 4.31995C8.44067 4.31995 8.114 4.04461 8.114 3.57795Z" fill="currentColor"/>\
</svg>',
			underlined: '<svg height="24" width="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M6 10V4h2v6a4 4 0 0 0 8 0V4h2v6a6 6 0 0 1-12 0ZM7 18a1 1 0 1 0 0 2h10a1 1 0 1 0 0-2H7Z" fill="currentColor"/></svg>',
			strike: '<svg style="enable-background:new 0 0 32 32" viewBox="0 0 32 32" xml:space="preserve" xmlns="http://www.w3.org/2000/svg">\
<path d="M26 15h-9.5C14 15 12 13 12 10.5S14 6 16.5 6 21 8 21 10.5c0 .6.4 1 1 1s1-.4 1-1C23 6.9 20.1 4 16.5 4S10 6.9 10 10.5c0 1.7.7 3.3 1.8 4.5H7c-.6 0-1 .4-1 1s.4 1 1 1h9.5c2.5 0 4.5 2 4.5 4.5S19 26 16.5 26 12 24 12 21.5c0-.6-.4-1-1-1s-1 .4-1 1c0 3.6 2.9 6.5 6.5 6.5s6.5-2.9 6.5-6.5c0-1.7-.7-3.3-1.8-4.5H26c.6 0 1-.4 1-1s-.4-1-1-1z" fill="currentColor"/>\
</svg>'
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
