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
		if (position === 0 || position === this.content.length) {
			return false
		}

		const container = this.getClosestContainer()
		const { weight, style } = this
		const tail = new Text(this.content.substr(position), { weight, style })
		let element = this.element

		while (element.nodeType !== 3) {
			element = element.firstChild
		}

		this.connect(tail)
		this.content = this.content.substr(0, position)
		element.nodeValue = this.content
		container.isChanged = true
		this.emitOnUpdate()

		return tail
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

	parse(element, parse, context) {
		if (element.nodeType !== 3 && (element.nodeType === 1 && ![ 'em', 'strong', 'span' ].includes(element.nodeName.toLowerCase()))) {
			return false
		}

		if (element.nodeType === 3) {
			const { weight, style } = context
			const firstChild = element.parentNode.firstChild
			const lastChild = element.parentNode.lastChild
			let content = element.nodeValue

			// TODO: Нужно уметьт лучше определять первую ноду. Имеется ввиду первая текстовая нода в контейнере
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

				item.replaceWith(replacementItem, item.next)
			}
		})
	}

	setBold(event, selection) {
		selection.selectedItems.forEach((item) => {
			if (item.type === 'text') {
				const { style } = item
				const replacementItem = new Text(item.content, { style, weight: 'bold' })

				item.replaceWith(replacementItem, item.next)
			}
		})
	}

	unsetItalic(event, selection) {
		selection.selectedItems.forEach((item) => {
			if (item.type === 'text' && item.style === 'italic') {
				const { weight } = item
				const replacementItem = new Text(item.content, { weight })

				item.replaceWith(replacementItem, item.next)
			}
		})
	}

	setItalic(event, selection) {
		selection.selectedItems.forEach((item) => {
			if (item.type === 'text') {
				const { weight } = item
				const replacementItem = new Text(item.content, { weight, style: 'italic' })

				item.replaceWith(replacementItem, item.next)
			}
		})
	}

	getSelectControls(selection) {
		let hasBold = false
		let hasItalic = false
		const controls = []

		selection.selectedItems.forEach((item) => {
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
				icon: 'bold',
				selected: () => true,
				action: this.unsetBold
			}))
		} else {
			controls.push(new ControlButton({
				label: 'Сделать жирным',
				icon: 'bold',
				action: this.setBold
			}))
		}

		if (hasItalic) {
			controls.push(new ControlButton({
				label: 'Сделать некурсивом',
				icon: 'italic',
				selected: () => true,
				action: this.unsetItalic
			}))
		} else {
			controls.push(new ControlButton({
				label: 'Сделать курсивом',
				icon: 'italic',
				action: this.setItalic
			}))
		}

		return controls
	}
}

module.exports.TextPlugin = TextPlugin
module.exports.Text = Text
