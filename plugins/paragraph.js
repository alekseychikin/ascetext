const PluginPlugin = require('./plugin')
const ControlButton = require('../controls/button')
const Container = require('../nodes/container')
const createElement = require('../create-element')

const icons = {
	create: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M6.32422 8.66016L5.74414 12H4.64258L6.125 3.46875L8.97266 3.47461C9.85156 3.47461 10.5293 3.70898 11.0059 4.17773C11.4824 4.64258 11.6875 5.26172 11.6211 6.03516C11.5508 6.85156 11.2246 7.49414 10.6426 7.96289C10.0645 8.43164 9.30078 8.66602 8.35156 8.66602L6.32422 8.66016ZM6.48242 7.74023L8.38086 7.74609C8.97852 7.74609 9.46875 7.5957 9.85156 7.29492C10.2344 6.99414 10.459 6.57617 10.5254 6.04102C10.5879 5.56055 10.4883 5.17188 10.2266 4.875C9.96484 4.57422 9.58398 4.41602 9.08398 4.40039L7.0625 4.39453L6.48242 7.74023Z" fill="#fff"/>\
</svg>'
}

class Paragraph extends Container {
	constructor() {
		super('paragraph')

		this.setElement(createElement('p'))
	}

	stringify(children) {
		return '<p>' + children + '</p>'
	}
}

class ParagraphPlugin extends PluginPlugin {
	parse(element, parse, context) {
		if (element.nodeType === 1 && [ 'p', 'div' ].includes(element.nodeName.toLowerCase())) {
			const node = new Paragraph()
			let children

			context.parsingContainer = true

			if (children = parse(element.firstChild, element.lastChild, context)) {
				node.append(children)
			}

			context.parsingContainer = false

			return node
		}

		return false
	}

	setParagraph(event, { anchorContainer, restoreSelection }) {
		if (anchorContainer.type !== 'paragraph') {
			const paragraph = new Paragraph()

			paragraph.append(anchorContainer.first)
			anchorContainer.replace(paragraph)
			restoreSelection()
		}
	}

	getInsertControls(container) {
		if (container.type === 'paragraph' || !container.parent.isSection) {
			return []
		}

		return [ new ControlButton({
			label: 'Сделать параграфом',
			icon: icons.create,
			action: this.setParagraph
		}) ]
	}

	getReplaceControls(container) {
		if (container.type === 'paragraph' || !container.parent.isSection) {
			return []
		}

		return [ new ControlButton({
			label: 'Сделать параграфом',
			icon: icons.create,
			action: this.setParagraph
		}) ]
	}
}

module.exports.ParagraphPlugin = ParagraphPlugin
module.exports.Paragraph = Paragraph
