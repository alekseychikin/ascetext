import PluginPlugin from './plugin'
import ControlButton from '../controls/button'
import Container from '../nodes/container'
import createElement from '../create-element'

export class Paragraph extends Container {
	constructor(type = 'paragraph') {
		super(type)

		this.setElement(createElement('p'))
	}

	duplicate() {
		const duplicate = new Paragraph()

		this.connect(duplicate)

		return duplicate
	}

	stringify(children) {
		return '<p>' + children + '</p>'
	}
}

export default class ParagraphPlugin extends PluginPlugin {
	fields = []
	isContainer = true

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

	setParagraph = (event, selection) => {
		const containers = [ selection.anchorContainer ]

		selection.selectedItems.forEach((item) => {
			const container = item.getClosestContainer()

			if (containers.indexOf(container) === -1) {
				containers.push(container)
			}
		})

		if (containers.indexOf(selection.focusContainer)) {
			containers.push(selection.focusContainer)
		}

		containers.forEach((container) => {
			if (container.type !== 'paragraph') {
				const paragraph = new Paragraph()

				paragraph.append(container.first)
				container.replaceWith(paragraph, container.next)
			}
		})
	}

	getInsertControls(container) {
		if (container.type === 'paragraph') {
			return []
		}

		return [ new ControlButton({
			label: 'Сделать параграфом',
			icon: 'p',
			action: this.setParagraph
		}) ]
	}
}
