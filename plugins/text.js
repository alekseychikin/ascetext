const Node = require('../nodes/node')
const PluginPlugin = require('./plugin')
const ControlButton = require('../controls/button')

const nbsCode = '\u00A0'

class Text extends Node {
	constructor(content, params) {
		super('text')

		this.content = content

		if (params.weight) {
			this.weight = params.weight
		}

		if (params.style) {
			this.style = params.style
		}

		if (!this.weight && !this.style) {
			this.element = document.createTextNode(this.content)
		} else if (this.weight === 'bold') {
			this.element = document.createElement('strong')
			const element = document.createTextNode(this.content)

			if (this.style === 'italic') {
				const italic = document.createElement('em')

				italic.appendChild(element)
				this.element.appendChild(italic)
			} else {
				this.element.appendChild(element)
			}
		} else if (this.style === 'italic') {
			this.element = document.createElement('em')
			const element = document.createTextNode(this.content)
			this.element.appendChild(element)
		}
	}

	normalize(element) {
		const fields = [ 'weight', 'style' ]
		let areEqualElements = true

		fields.forEach((field) => {
			if (this[field] !== element[field]) {
				areEqualElements = false
			}
		})

		if (areEqualElements) {
			return new Text(this.content + element.content, {
				weight: this.weight,
				style: this.style
			})
		}

		return false
	}

	split(position) {
		const { weight, style } = this
		const params = { weight, style }
		const head = new Text(this.content.substr(0, position), params)
		const tail = new Text(this.content.substr(position), params)

		head.connect(tail)
		this.replace(head)

		return {
			head,
			tail
		}
	}

	stringify() {
		let content = ''

		if (this.weight === 'bold') {
			content += '<strong>'
		}

		if (this.style === 'italic') {
			content += '<em>'
		}

		content += this.content

		if (this.style === 'italic') {
			content += '</em>'
		}

		if (this.weight === 'bold') {
			content += '</strong>'
		}

		return content
	}
}

class TextPlugin extends PluginPlugin {
	constructor() {
		super()

		this.unsetBold = this.unsetBold.bind(this)
		this.setBold = this.setBold.bind(this)
		this.unsetItalic = this.unsetItalic.bind(this)
		this.setItalic = this.setItalic.bind(this)
	}

	// не нравится
	parse(element, parse, context) {
		if (element.nodeType !== 3 && (element.nodeType === 1 && ![ 'em', 'strong', 'span' ].includes(element.nodeName.toLowerCase()))) {
			return false
		}

		if (element.nodeType === 3) {
			const { weight, style } = context
			const firstChild = element.parentNode.firstChild
			const lastChild = element.parentNode.lastChild
			let content = element.nodeValue

			// TODO: Нужно уметь лучше определять первую ноду. Имеется ввиду первая текстовая нода в контейнере
			// а не просто в каком угодно первом элементе (например ссылке)
			if (element === firstChild) {
				content = content.trimLeft()
			}

			if (element === lastChild) {
				content = content.replace(/\n[\n\s]*$/, '').replace(/\s$/, nbsCode)
			}

			if (!content.length || !context.parsingContainer && content.match(/^[\n\s]+$/)) {
				return false
			}

			return new Text(content, { weight, style })
		}

		if (element.nodeName.toLowerCase() === 'em') {
			context.style = 'italic'

			const model = parse(element.firstChild, element.lastChild, context)

			delete context.style

			return model
		}

		if (element.nodeName.toLowerCase() === 'strong') {
			context.weight = 'bold'

			const model = parse(element.firstChild, element.lastChild, context)

			delete context.weight

			return model
		}

		if (element.nodeName.toLowerCase() === 'span') {
			return parse(element.firstChild, element.lastChild, context)
		}
	}

	unsetBold(event, selection) {
		selection.selectedItems.forEach((item) => {
			if (item.type === 'text' && item.weight === 'bold') {
				const { style } = item
				const replacementItem = new Text(item.content, { style })

				item.replaceUntil(replacementItem, item)
			}
		})
	}

	setBold(event, selection) {
		selection.selectedItems.forEach((item) => {
			if (item.type === 'text') {
				const { style } = item
				const replacementItem = new Text(item.content, { style, weight: 'bold' })

				item.replaceUntil(replacementItem, item)
			}
		})
	}

	unsetItalic(event, selection) {
		selection.selectedItems.forEach((item) => {
			if (item.type === 'text' && item.style === 'italic') {
				const { weight } = item
				const replacementItem = new Text(item.content, { weight })

				item.replaceUntil(replacementItem, item)
			}
		})
	}

	setItalic(event, selection) {
		selection.selectedItems.forEach((item) => {
			if (item.type === 'text') {
				const { weight } = item
				const replacementItem = new Text(item.content, { weight, style: 'italic' })

				item.replaceUntil(replacementItem, item)
			}
		})
	}

	getSelectControls(focusedNodes) {
		let hasBold = false
		let hasItalic = false
		const controls = []

		if (!this.core.selection.isRange) {
			return []
		}

		focusedNodes.forEach((item) => {
			if (item.type === 'text' && item.weight === 'bold') {
				hasBold = true
			}

			if (item.type === 'text' && item.style === 'italic') {
				hasItalic = true
			}
		})

		if (hasBold) {
			controls.push(new ControlButton({
				label: 'Сделать нежирным',
				icon: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M10.6876 5.40278C10.6876 5.64352 10.6545 5.88426 10.5882 6.125C10.5314 6.36574 10.432 6.58796 10.2901 6.79167C10.1481 6.98611 9.96349 7.16204 9.73631 7.31944C9.50913 7.46759 9.23462 7.5787 8.91278 7.65278V7.73611C9.19675 7.78241 9.46653 7.86111 9.72211 7.97222C9.97769 8.08333 10.2001 8.23611 10.3895 8.43056C10.5788 8.625 10.7255 8.86111 10.8296 9.13889C10.9432 9.41667 11 9.74537 11 10.125C11 10.625 10.8911 11.0602 10.6734 11.4306C10.4557 11.7917 10.1623 12.088 9.7931 12.3194C9.4334 12.5509 9.02164 12.7222 8.55781 12.8333C8.09398 12.9444 7.61596 13 7.12373 13C6.96281 13 6.75456 13 6.49899 13C6.25287 13 5.9831 12.9907 5.68966 12.9722C5.40568 12.963 5.11224 12.9444 4.80933 12.9167C4.51589 12.8889 4.24611 12.8472 4 12.7917V3.20833C4.17985 3.18056 4.38337 3.15278 4.61055 3.125C4.84719 3.09722 5.09804 3.07407 5.36308 3.05556C5.62813 3.03704 5.8979 3.02315 6.17241 3.01389C6.45639 3.00463 6.73563 3 7.01014 3C7.47397 3 7.9236 3.03704 8.35903 3.11111C8.80392 3.17593 9.19675 3.2963 9.53753 3.47222C9.88776 3.64815 10.167 3.89352 10.3753 4.20833C10.5835 4.52315 10.6876 4.9213 10.6876 5.40278ZM7.13793 11.4306C7.37458 11.4306 7.60176 11.4028 7.81947 11.3472C8.04665 11.2917 8.24544 11.2083 8.41582 11.0972C8.58621 10.9769 8.72346 10.8287 8.82759 10.6528C8.93171 10.4769 8.98377 10.2685 8.98377 10.0278C8.98377 9.72222 8.92224 9.48148 8.79919 9.30556C8.67613 9.12963 8.51521 8.99537 8.31643 8.90278C8.11765 8.80093 7.8952 8.73611 7.64909 8.70833C7.40298 8.68056 7.15686 8.66667 6.91075 8.66667H6C6 9 6 11 6 11.3771C6.03013 11.3816 6.06393 11.3856 6.10142 11.3889C6.20554 11.3981 6.3144 11.4074 6.42799 11.4167C6.55105 11.4167 6.6741 11.4213 6.79716 11.4306C6.92968 11.4306 7.04327 11.4306 7.13793 11.4306ZM6.49899 7.22222C6.63151 7.22222 6.78296 7.21759 6.95335 7.20833C7.1332 7.19907 7.27992 7.18519 7.39351 7.16667C7.75321 7.05556 8.06085 6.88889 8.31643 6.66667C8.58147 6.44444 8.714 6.15278 8.714 5.79167C8.714 5.55093 8.66667 5.35185 8.57201 5.19444C8.47735 5.03704 8.34956 4.91204 8.18864 4.81944C8.03719 4.72685 7.86207 4.66204 7.66329 4.625C7.4645 4.58796 7.25625 4.56944 7.03854 4.56944C6.79243 4.56944 6.56525 4.57407 6.357 4.58333C6.21644 4.58958 6.09744 4.59794 6 4.60841C6 5 5.9823 6.85673 6 7.22222H6.49899Z" fill="#fff"/>\
</svg>',
				selected: () => true,
				action: this.unsetBold
			}))
		} else {
			controls.push(new ControlButton({
				label: 'Сделать жирным',
				icon: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M10.6876 5.40278C10.6876 5.64352 10.6545 5.88426 10.5882 6.125C10.5314 6.36574 10.432 6.58796 10.2901 6.79167C10.1481 6.98611 9.96349 7.16204 9.73631 7.31944C9.50913 7.46759 9.23462 7.5787 8.91278 7.65278V7.73611C9.19675 7.78241 9.46653 7.86111 9.72211 7.97222C9.97769 8.08333 10.2001 8.23611 10.3895 8.43056C10.5788 8.625 10.7255 8.86111 10.8296 9.13889C10.9432 9.41667 11 9.74537 11 10.125C11 10.625 10.8911 11.0602 10.6734 11.4306C10.4557 11.7917 10.1623 12.088 9.7931 12.3194C9.4334 12.5509 9.02164 12.7222 8.55781 12.8333C8.09398 12.9444 7.61596 13 7.12373 13C6.96281 13 6.75456 13 6.49899 13C6.25287 13 5.9831 12.9907 5.68966 12.9722C5.40568 12.963 5.11224 12.9444 4.80933 12.9167C4.51589 12.8889 4.24611 12.8472 4 12.7917V3.20833C4.17985 3.18056 4.38337 3.15278 4.61055 3.125C4.84719 3.09722 5.09804 3.07407 5.36308 3.05556C5.62813 3.03704 5.8979 3.02315 6.17241 3.01389C6.45639 3.00463 6.73563 3 7.01014 3C7.47397 3 7.9236 3.03704 8.35903 3.11111C8.80392 3.17593 9.19675 3.2963 9.53753 3.47222C9.88776 3.64815 10.167 3.89352 10.3753 4.20833C10.5835 4.52315 10.6876 4.9213 10.6876 5.40278ZM7.13793 11.4306C7.37458 11.4306 7.60176 11.4028 7.81947 11.3472C8.04665 11.2917 8.24544 11.2083 8.41582 11.0972C8.58621 10.9769 8.72346 10.8287 8.82759 10.6528C8.93171 10.4769 8.98377 10.2685 8.98377 10.0278C8.98377 9.72222 8.92224 9.48148 8.79919 9.30556C8.67613 9.12963 8.51521 8.99537 8.31643 8.90278C8.11765 8.80093 7.8952 8.73611 7.64909 8.70833C7.40298 8.68056 7.15686 8.66667 6.91075 8.66667H6C6 9 6 11 6 11.3771C6.03013 11.3816 6.06393 11.3856 6.10142 11.3889C6.20554 11.3981 6.3144 11.4074 6.42799 11.4167C6.55105 11.4167 6.6741 11.4213 6.79716 11.4306C6.92968 11.4306 7.04327 11.4306 7.13793 11.4306ZM6.49899 7.22222C6.63151 7.22222 6.78296 7.21759 6.95335 7.20833C7.1332 7.19907 7.27992 7.18519 7.39351 7.16667C7.75321 7.05556 8.06085 6.88889 8.31643 6.66667C8.58147 6.44444 8.714 6.15278 8.714 5.79167C8.714 5.55093 8.66667 5.35185 8.57201 5.19444C8.47735 5.03704 8.34956 4.91204 8.18864 4.81944C8.03719 4.72685 7.86207 4.66204 7.66329 4.625C7.4645 4.58796 7.25625 4.56944 7.03854 4.56944C6.79243 4.56944 6.56525 4.57407 6.357 4.58333C6.21644 4.58958 6.09744 4.59794 6 4.60841C6 5 5.9823 6.85673 6 7.22222H6.49899Z" fill="#fff"/>\
</svg>',
				action: this.setBold
			}))
		}

		if (hasItalic) {
			controls.push(new ControlButton({
				label: 'Сделать некурсивом',
				icon: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M6.994 6.68595V6.33595C7.62395 6.08397 8 6 8.996 5.83195L9.248 5.99995L7.99999 12H8.99999V12.364C8.59111 12.6755 8.01544 13 7.49999 13C6.49245 13 6.75943 12.0406 6.91 11.3479L7.89 6.82595L6.994 6.68595ZM8.114 3.57795C8.114 3.09261 8.44067 2.79395 8.926 2.79395C9.44867 2.79395 9.766 3.09261 9.766 3.57795C9.766 4.04461 9.44867 4.31995 8.926 4.31995C8.44067 4.31995 8.114 4.04461 8.114 3.57795Z" fill="#fff"/>\
</svg>',
				selected: () => true,
				action: this.unsetItalic
			}))
		} else {
			controls.push(new ControlButton({
				label: 'Сделать курсивом',
				icon: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M6.994 6.68595V6.33595C7.62395 6.08397 8 6 8.996 5.83195L9.248 5.99995L7.99999 12H8.99999V12.364C8.59111 12.6755 8.01544 13 7.49999 13C6.49245 13 6.75943 12.0406 6.91 11.3479L7.89 6.82595L6.994 6.68595ZM8.114 3.57795C8.114 3.09261 8.44067 2.79395 8.926 2.79395C9.44867 2.79395 9.766 3.09261 9.766 3.57795C9.766 4.04461 9.44867 4.31995 8.926 4.31995C8.44067 4.31995 8.114 4.04461 8.114 3.57795Z" fill="#fff"/>\
</svg>',
				action: this.setItalic
			}))
		}

		return controls
	}
}

module.exports.TextPlugin = TextPlugin
module.exports.Text = Text
