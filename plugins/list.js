const PluginPlugin = require('./plugin')
const getNodeByElement = require('../nodes/node').getNodeByElement
const Container = require('../nodes/container')
const Group = require('../nodes/group')
const ControlButton = require('../controls/button')
const Paragraph = require('./paragraph').Paragraph
const BreakLine = require('./break-line').BreakLine
const createElement = require('../create-element')

class List extends Group {
	constructor(core, decor = 'marker') {
		super(core, 'list')

		this.fields = [ 'decor' ]
		this.decor = decor
		this.isDeleteEmpty = true
		this.setElement(createElement(this.decor === 'number' ? 'ol' : 'ul'))
	}

	normalize(element) {
		if (this.decor === element.decor) {
			const list = new List(this.core, this.decor)

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

class ListItem extends Container {
	constructor(core) {
		super(core, 'list-item')

		this.setElement(createElement('li'))
	}

	backspaceHandler(event) {
		// const isEmptyItem = this.core.selection.focusAtLastPositionInContainer && core.selection.anchorAtFirstPositionInContainer
		const isAtFirstPosition = this.core.selection.anchorAtFirstPositionInContainer
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
				const paragraph = new Paragraph(this.core)

				parent.connect(paragraph)

				if (this.first) {
					paragraph.append(this.first)
				}

				this.delete()

				if (ul) {
					// debugger
					paragraph.connect(ul)
				}

				this.core.selection.setSelection(paragraph, 0)
			}
		}
	}

	enterHandler(event) {
		event.preventDefault()

		const isEmptyItem = this.core.selection.focusAtLastPositionInContainer &&
			this.core.selection.anchorAtFirstPositionInContainer
		const parent = this.parent
		// const isFirstItem = parent.first === this
		const isLastItem = parent.last === this

		if (isEmptyItem) {
			let ul

			if (!isLastItem) {
				ul = new List(this.core, parent.decor)
				ul.append(this.next)
			}

			if (parent.parent.type === 'list-item') {
				// Добавить после li ещё один li
					// Если есть созданный ul
						// Добавить после li ещё один li и поместить в него ul
			} else if (parent.parent.isSection) {
				const paragraph = new Paragraph(this.core)

				parent.connect(paragraph)
				this.delete()

				if (ul) {
					// debugger
					paragraph.connect(ul)
					this.core.selection.setSelection(paragraph, 0)
				}

				this.core.selection.setSelection(paragraph, 0)
			}
		} else {
			const nextItem = new ListItem(this.core)

			this.connect(nextItem)

			if (this.core.selection.focusAtLastPositionInContainer) {
				this.core.selection.setSelection(nextItem, 0)
			} else {
				const [ selectedAnchorChild, anchorOffset ] = this.getChildByOffset(
					this.core.selection.anchorOffset
				)

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
						this.core.selection.setSelection(anchorTail, 0)
					} else {
						nextItem.append(selectedAnchorNode)
						this.append(new BreakLine())
						this.core.selection.setSelection(nextItem, 0)
					}
				} else {
					console.error('enter under not text focus')
				}
			}
		}
	}

	duplicate() {
		const duplicate = new ListItem(this.core)

		this.connect(duplicate)

		return duplicate
	}

	stringify(children) {
		return '<li>' + children + '</li>'
	}
}

class ListPlugin extends PluginPlugin {
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
		const list = new List(this.core, 'number')
		const listItem = new ListItem(this.core)

		list.append(listItem)
		selection.anchorContainer.replaceUntil(list, selection.anchorContainer)
		selection.restoreSelection()
	}

	setMarkerList(event, selection) {
		const list = new List(this.core, 'marker')
		const listItem = new ListItem(this.core)

		list.append(listItem)
		selection.anchorContainer.replaceUntil(list, selection.anchorContainer)
		selection.restoreSelection()
	}
}

module.exports.ListPlugin = ListPlugin
module.exports.List = List
module.exports.ListItem = ListItem
