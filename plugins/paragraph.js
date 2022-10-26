import PluginPlugin from './plugin'
import Container from '../nodes/container'
import createElement from '../utils/create-element'
import isHtmlElement from '../utils/is-html-element'

export class Paragraph extends Container {
	constructor() {
		super('paragraph')

		this.setElement(createElement('p'))
	}

	stringify(children) {
		return '<p>' + children + '</p>'
	}
}

export default class ParagraphPlugin extends PluginPlugin {
	create() {
		return new Paragraph()
	}

	get icons() {
		return {
			paragraph: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M6.32422 8.66016L5.74414 12H4.64258L6.125 3.46875L8.97266 3.47461C9.85156 3.47461 10.5293 3.70898 11.0059 4.17773C11.4824 4.64258 11.6875 5.26172 11.6211 6.03516C11.5508 6.85156 11.2246 7.49414 10.6426 7.96289C10.0645 8.43164 9.30078 8.66602 8.35156 8.66602L6.32422 8.66016ZM6.48242 7.74023L8.38086 7.74609C8.97852 7.74609 9.46875 7.5957 9.85156 7.29492C10.2344 6.99414 10.459 6.57617 10.5254 6.04102C10.5879 5.56055 10.4883 5.17188 10.2266 4.875C9.96484 4.57422 9.58398 4.41602 9.08398 4.40039L7.0625 4.39453L6.48242 7.74023Z" fill="currentColor"/>\
</svg>'
		}
	}

	parse(element, builder, context) {
		if (isHtmlElement(element) && [ 'p', 'div' ].includes(element.nodeName.toLowerCase())) {
			const node = new Paragraph()
			let children

			if (children = builder.parse(element, context)) {
				builder.append(node, children)
			}

			return node
		}

		return false
	}

	parseJson(element, builder) {
		if (element.type === 'paragraph') {
			const node = builder.create('paragraph')
			let children

			if (children = builder.parseJson(element.body)) {
				builder.append(node, children)
			}

			return node
		}

		return false
	}

	setParagraph(event, { builder, anchorContainer }) {
		if (anchorContainer.type !== 'paragraph') {
			const paragraph = new Paragraph()

			builder.append(paragraph, anchorContainer.first)
			builder.replace(anchorContainer, paragraph)
		}
	}

	getInsertControls(container) {
		if (container.type === 'paragraph' || !container.parent.isSection) {
			return []
		}

		return [{
			slug: 'paragraph.create',
			label: 'Сделать параграфом',
			icon: 'paragraph',
			action: this.setParagraph
		}]
	}

	getReplaceControls(container) {
		if (container.type === 'paragraph' || !container.parent.isSection) {
			return []
		}

		return [{
			slug: 'paragraph.create',
			label: 'Сделать параграфом',
			icon: 'paragraph',
			action: this.setParagraph
		}]
	}
}
