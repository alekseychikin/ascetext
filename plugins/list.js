import PluginPlugin from './plugin'
import { getNodeByElement } from '../nodes/node'
import Container from '../nodes/container'
import Group from '../nodes/group'
import ControlButton from '../controls/button'
import { Paragraph } from './paragraph'
import { BreakLine } from './break-line'
import createElement from '../create-element'

export class List extends Group {
	fields = [ 'decor' ]

	constructor(decor = 'marker') {
		super('list')

		this.decor = decor
		this.isDeleteEmpty = true
		this.setElement(createElement(this.decor === 'number' ? 'ol' : 'ul'))
	}

	normalize(element) {
		if (this.decor === element.decor) {
			const list = new List(this.decor)

			list.append(this.first)
			list.append(element.first)

			return list
		}
	}

	stringify(children) {
		let tagName = ''

		if (this.decor === 'number') {
			tagName = 'ol'
		} else {
			tagName = 'ul'
		}

		return '<' + tagName + '>' + children + '</' + tagName + '>'
	}
}

export class ListItem extends Container {
	constructor() {
		super('list-item')

		this.setElement(createElement('li'))
	}

	backspaceHandler(event, core) {
		// const isEmptyItem = core.selection.focusAtLastPositionInContainer && core.selection.anchorAtFirstPositionInContainer
		const isAtFirstPosition = core.selection.anchorAtFirstPositionInContainer
		const parent = this.parent
		const isLastItem = parent.last === this

		if (isAtFirstPosition) {
			event.preventDefault()

			let ul

			if (!isLastItem) {
				ul = new List(parent.decor)
				ul.append(this.next)
			}

			if (parent.parent.type === 'list-item') {
				// Добавить после li ещё один li
					// Если есть созданный ul
						// Добавить после li ещё один li и поместить в него ul
			} else if (parent.parent.isSection) {
				const paragraph = new Paragraph()

				parent.connect(paragraph)

				if (this.first) {
					paragraph.append(this.first)
				}

				this.delete()

				if (ul) {
					// debugger
					paragraph.connect(ul)
				}

				core.selection.setSelection(paragraph.element, 0)
			}
		}
	}

	enterHandler(event, core) {
		event.preventDefault()

		const isEmptyItem = core.selection.focusAtLastPositionInContainer && core.selection.anchorAtFirstPositionInContainer
		const parent = this.parent
		// const isFirstItem = parent.first === this
		const isLastItem = parent.last === this

		if (isEmptyItem) {
			let ul

			if (!isLastItem) {
				ul = new List(parent.decor)
				ul.append(this.next)
			}

			if (parent.parent.type === 'list-item') {
				// Добавить после li ещё один li
					// Если есть созданный ul
						// Добавить после li ещё один li и поместить в него ul
			} else if (parent.parent.isSection) {
				const paragraph = new Paragraph()

				parent.connect(paragraph)
				this.delete()

				if (ul) {
					// debugger
					paragraph.connect(ul)
					core.selection.setSelection(paragraph.element, 0)
				}

				core.selection.setSelection(paragraph.element, 0)
			}
		} else {
			const nextItem = new ListItem()

			this.connect(nextItem)

			if (core.selection.focusAtLastPositionInContainer) {
				core.selection.setSelection(nextItem.element, 0)
			} else {
				const [ selectedAnchorChild, anchorOffset ] = this.getChildByOffset(core.selection.anchorOffset)

				if (selectedAnchorChild && selectedAnchorChild.nodeType === 3) {
					const selectedAnchorNode = getNodeByElement(selectedAnchorChild)
					let anchorTail = selectedAnchorNode.split(anchorOffset)
					let anchorParent = selectedAnchorNode.parent

					while (anchorParent !== this) {
						anchorTail = anchorParent.split(anchorTail)
						anchorParent = anchorParent.parent
					}

					if (anchorTail) {
						nextItem.append(anchorTail)
						core.selection.setSelection(anchorTail.element, 0)
					} else {
						nextItem.append(selectedAnchorNode)
						this.append(new BreakLine())
						core.selection.setSelection(nextItem.element, 0)
					}
				} else {
					console.error('enter under not text focus')
				}
			}
		}
	}

	duplicate() {
		const duplicate = new ListItem()

		this.connect(duplicate)

		return duplicate
	}

	stringify(children) {
		return '<li>' + children + '</li>'
	}
}

export default class ListPlugin extends PluginPlugin {
	getInsertControls(container) {
		if (container.parent.isSection) {
			return [ new ControlButton({
				label: 'Добавить маркированный спискок',
				icon: 'list-marker',
				action: this.setMarkerList
			}), new ControlButton({
				label: 'Добавить нумерованный список',
				icon: 'list-number',
				action: this.setNumberList
			}) ]
		}

		return []
	}

	parse(element, parse, context) {
		const nodeName = element.nodeName.toLowerCase()

		if (element.nodeType === 1 && (nodeName === 'ul' || nodeName === 'ol')) {
			const nodeName = element.nodeName.toLowerCase()
			const decor = nodeName === 'ul' ? 'marker' : 'numerable'
			const list = new List(decor)
			let children

			if (children = parse(element.firstChild, element.lastChild, context)) {
				list.append(children)
			}

			return list
		}

		if (element.nodeType === 1 && nodeName === 'li') {
			const listItem = new ListItem()
			let children

			context.parsingContainer = true

			if (children = parse(element.firstChild, element.lastChild, context)) {
				listItem.append(children)
			}

			context.parsingContainer = false

			return listItem
		}

		return false
	}

	setNumberList(event, selection) {
		const list = new List('number')
		const listItem = new ListItem()

		list.append(listItem)
		selection.anchorContainer.replaceWith(list, selection.anchorContainer.next)
		selection.restoreSelection()
	}

	setMarkerList(event, selection) {
		const list = new List('marker')
		const listItem = new ListItem()

		list.append(listItem)
		selection.anchorContainer.replaceWith(list, selection.anchorContainer.next)
		selection.restoreSelection()
	}
}
