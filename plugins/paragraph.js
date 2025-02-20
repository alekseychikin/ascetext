import PluginPlugin from './plugin.js'
import Container from '../nodes/container.js'

export class Paragraph extends Container {
	constructor() {
		super('paragraph')
	}

	render(body) {
		return {
			type: 'p',
			attributes: {},
			body
		}
	}

	stringify(children) {
		return '<p>' + children + '</p>'
	}
}

export default class ParagraphPlugin extends PluginPlugin {
	get register() {
		return {
			'paragraph': Paragraph
		}
	}

	get icons() {
		return {
			paragraph: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 18 8 6 3 18m8-4H5m16 4v-6m0 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
		}
	}

	parseJson(element, builder) {
		if (element.type === 'paragraph') {
			return builder.create('paragraph')
		}
	}

	parseTree(element, builder) {
		if (element.type === 'p') {
			return builder.create('paragraph')
		}
	}

	setParagraph(event, { builder, focusedNodes }) {
		focusedNodes.forEach((item) => {
			if (item.isContainer && item.parent.isSection && item.type !== 'paragraph') {
				const paragraph = builder.create('paragraph')

				builder.replace(item, paragraph)
				builder.moveTail(item, paragraph, 0)
			}
		})
	}

	getInsertControls(container) {
		if (container.type === 'paragraph' || !container.parent.isSection) {
			return []
		}

		return [{
			slug: 'paragraph.create',
			label: 'Paragraph',
			icon: 'paragraph',
			action: this.setParagraph
		}]
	}

	getReplaceControls(focusedNodes) {
		const containers = focusedNodes.filter((node) => node.isContainer && node.parent.isSection)
		const paragraphs = containers.filter((node) => node.type === 'paragraph')

		if (!containers.length) {
			return []
		}

		return [{
			slug: 'paragraph.create',
			label: 'Paragraph',
			icon: 'paragraph',
			selected: paragraphs.length > 0,
			action: this.setParagraph
		}]
	}
}
