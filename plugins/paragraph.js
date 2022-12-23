import PluginPlugin from './plugin'
import Container from '../nodes/container'
import createElement from '../utils/create-element'
import isHtmlElement from '../utils/is-html-element'

export class Paragraph extends Container {
	constructor() {
		super('paragraph')
	}

	render() {
		return createElement('p')
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
			paragraph: '<svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 18 8 6 3 18m8-4H5m16 4v-6m0 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
		}
	}

	parse(element, builder) {
		if (isHtmlElement(element) && [ 'p', 'div' ].includes(element.nodeName.toLowerCase())) {
			return builder.create('paragraph')
		}
	}

	parseJson(element, builder) {
		if (element.type === 'paragraph') {
			return builder.create('paragraph')
		}
	}

	setParagraph(event, { builder, anchorContainer }) {
		if (anchorContainer.type !== 'paragraph') {
			const paragraph = builder.create('paragraph')

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
		if (container.type === 'paragraph' || !container.parent.isSection || !container.isContainer) {
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
