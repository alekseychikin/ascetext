import PluginPlugin from './plugin'
import ControlButton from '../controls/button'
import { Paragraph } from './paragraph'
import createElement from '../create-element'

class Header extends Paragraph {
	fields = [ 'level' ]

	constructor(level) {
		super('header')

		this.level = level
		this.setElement(createElement(`h${this.level}`))
	}

	duplicate() {
		const duplicate = new Header(this.level)

		this.connect(duplicate)

		return duplicate
	}

	stringify(children) {
		return '<h' + this.level + '>' + children + '</h' + this.level + '>'
	}
}

export default class HeaderPlugin extends PluginPlugin {
	fields = [ 'level' ]
	isContainer = true

	parse(element, parse, context) {
		if (element.nodeType === 1 && [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ].includes(element.nodeName.toLowerCase())) {
			const level = Number(element.nodeName.toLowerCase().match(/(\d)+/)[1])
			let children
			const node = new Header(level)

			context.parsingContainer = true

			if (children = parse(element.firstChild, element.lastChild, context)) {
				node.append(children)
			}

			context.parsingContainer = false

			return node
		}

		return false
	}

	setHeader = (level) => (event, selection) => {
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
			if (container.type !== 'header' || container.level !== level) {
				const header = new Header(level)

				header.append(container.first)
				container.replaceWith(header, container.next)
			}
		})
	}

	getInsertControls(container) {
		const controls = [ new ControlButton({
			label: 'Сделать заголовком',
			icon: 'h2',
			action: this.setHeader(2)
		}), new ControlButton({
			label: 'Сделать заголовком',
			icon: 'h3',
			action: this.setHeader(3)
		}), new ControlButton({
			label: 'Сделать заголовком',
			icon: 'h4',
			action: this.setHeader(4)
		}) ]

		if (container.type === 'header') {
			controls.splice(container.level - 2, 1)
		}

		return controls
	}
}
