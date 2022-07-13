const PluginPlugin = require('./plugin')
const getNodeByElement = require('../nodes/node').getNodeByElement
const Container = require('../nodes/container')
const Group = require('../nodes/group')
const ControlButton = require('../controls/button')
const Paragraph = require('./paragraph').Paragraph
const BreakLine = require('./break-line').BreakLine
const createElement = require('../core/create-element')

class List extends Group {
	constructor(attributes = { decor: 'marker' }) {
		super('list', attributes)

		this.isDeleteEmpty = true
		this.setElement(createElement(this.attributes.decor === 'number' ? 'ol' : 'ul'))
		console.log(this)
	}

	normalize(element) {
		if (this.attributes.decor === element.attributes.decor) {
			const list = new List(this.attributes)

			list.append(this.first)
			list.append(element.first)

			return list
		}
	}

	stringify(children) {
		const tagName = this.attributes.decor === 'number' ? 'ol' : 'ul'

		return '<' + tagName + '>' + children + '</' + tagName + '>'
	}
}

class ListItem extends Container {
	constructor() {
		super('list-item')

		this.setElement(createElement('li'))
	}

	backspaceHandler(event, {
		builder,
		anchorAtFirstPositionInContainer,
		setSelection
	}) {
		const parent = this.parent
		const isLastItem = parent.last === this

		if (anchorAtFirstPositionInContainer) {
			event.preventDefault()

			let ul

			if (!isLastItem) {
				ul = builder.create('list', parent.attributes)
				builder.append(ul, this.next)
			}

			if (parent.parent.type === 'list-item') {
				// Добавить после li ещё один li
					// Если есть созданный ul
						// Добавить после li ещё один li и поместить в него ul
			} else if (parent.parent.isSection) {
				const newBlock = builder.createBlock()

				builder.connect(parent, newBlock)

				if (this.first) {
					builder.append(newBlock, this.first)
				}

				builder.cut(this)

				if (ul) {
					// debugger
					builder.connect(newBlock, ul)
				}

				setSelection(newBlock, 0)
			}
		}
	}

	enterHandler(event, {
		builder,
		focusAtLastPositionInContainer,
		anchorAtFirstPositionInContainer,
		setSelection,
		anchorOffset
	}) {
		event.preventDefault()

		const isEmptyItem = focusAtLastPositionInContainer &&
			anchorAtFirstPositionInContainer
		const parent = this.parent
		// const isFirstItem = parent.first === this
		const isLastItem = parent.last === this

		if (isEmptyItem) {
			let ul

			if (!isLastItem) {
				ul = builder.create('list', parent.decor)
				builder.append(ul, this.next)
			}

			if (parent.parent.type === 'list-item') {
				// Добавить после li ещё один li
					// Если есть созданный ul
						// Добавить после li ещё один li и поместить в него ul
			} else if (parent.parent.isSection) {
				const paragraph = builder.create('paragraph')

				builder.connect(parent, paragraph)
				builder.cut(this)

				if (ul) {
					// debugger
					builder.connect(paragraph, ul)
					setSelection(paragraph, 0)
				}

				setSelection(paragraph, 0)
			}
		} else if (focusAtLastPositionInContainer) {
			const nextItem = new ListItem()

			builder(this.connect, nextItem)
			setSelection(nextItem, 0)
		} else {
			const { tail } = builder.split(this, anchorOffset)

			if (tail !== null) {
				setSelection(tail, 0)
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

class ListPlugin extends PluginPlugin {
	create(params) {
		return new List(params)
	}

	getInsertControls(container) {
		if (container.parent.isSection) {
			return [
				new ControlButton({
					label: 'Добавить маркированный спискок',
					icon: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M4 4H15V5H4V4ZM4 6H12V7H4V6Z" fill="#fff"/>\
<path fill-rule="evenodd" clip-rule="evenodd" d="M4 9H14V10H4V9ZM4 11H11V12H4V11Z" fill="#fff"/>\
<circle cx="2" cy="5" r="1" fill="#fff"/>\
<circle cx="2" cy="10" r="1" fill="#fff"/>\
</svg>',
					action: this.setMarkerList(container)
				}),
				new ControlButton({
					label: 'Добавить нумерованный список',
					icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M4.5 3H3L1.08398 4.62598L1.91603 5.87405L3 4.98302V10.5H4.5V3.75V3ZM22.5 4.5H9V6H22.5V4.5ZM18.4091 7.5H9V9H18.4091V7.5ZM21.1364 13.5H9V15H21.1364V13.5ZM17.0455 16.5H9V18H17.0455V16.5ZM2.25 14.25C3 14.25 3 14.2507 3 14.2507L2.99999 14.2527L2.99998 14.2549L2.99995 14.2581C2.99995 14.2581 3.00028 14.2494 3.00102 14.239C3.00253 14.2179 3.0059 14.1829 3.01323 14.1389C3.02848 14.0474 3.05759 13.9369 3.10832 13.8354C3.15758 13.7369 3.2197 13.6612 3.29884 13.6084C3.37328 13.5588 3.50624 13.5 3.75 13.5C4.07679 13.5 4.26338 13.5376 4.36325 13.5736C4.40999 13.5904 4.43179 13.6047 4.43919 13.6102C4.44304 13.613 4.4454 13.6156 4.4454 13.6156C4.4454 13.6156 4.46784 13.6481 4.48288 13.7633C4.49879 13.8851 4.5 14.031 4.5 14.25C4.5 14.3996 4.41356 14.6682 4.15721 15.0527C3.91423 15.4172 3.57705 15.7998 3.21967 16.1572C2.86542 16.5114 2.50847 16.824 2.23861 17.0488C2.10421 17.1608 1.99268 17.25 1.91554 17.3107C1.877 17.3409 1.84713 17.364 1.82737 17.3792L1.80553 17.3958L1.79976 17.4002L1.5 17.625V19.5H6V18H3.43601C3.68848 17.7819 3.98365 17.5145 4.28033 17.2178C4.67295 16.8252 5.08577 16.364 5.40529 15.8848C5.71144 15.4255 6 14.8504 6 14.25L6 14.2288C6.00004 14.037 6.0001 13.7976 5.97025 13.569C5.93841 13.3252 5.8664 13.0335 5.6796 12.7631C5.27553 12.1781 4.57095 12 3.75 12C3.24376 12 2.81422 12.1287 2.46679 12.3603C2.12405 12.5888 1.90492 12.8881 1.76668 13.1646C1.62991 13.4381 1.56527 13.7026 1.53364 13.8923C1.51753 13.989 1.50919 14.0712 1.50484 14.1321C1.50265 14.1627 1.50144 14.1883 1.50078 14.2082L1.50014 14.2336L1.50003 14.243L1.50001 14.2468L1.5 14.2492C1.5 14.2492 1.5 14.25 2.25 14.25Z" fill="white"/>\
</svg>',
					action: this.setNumberList(container)
				})
			]
		}

		return []
	}

	parse(element, builder, context) {
		const nodeName = element.nodeName.toLowerCase()

		if (element.nodeType === 1 && (nodeName === 'ul' || nodeName === 'ol')) {
			const nodeName = element.nodeName.toLowerCase()
			const decor = nodeName === 'ul' ? 'marker' : 'numerable'
			const list = new List(decor)
			let children

			if (children = builder.parse(element.firstChild, element.lastChild, context)) {
				builder.append(list, children)
			}

			return list
		}

		if (element.nodeType === 1 && nodeName === 'li') {
			const listItem = new ListItem()
			let children

			context.parsingContainer = true

			if (children = builder.parse(element.firstChild, element.lastChild, context)) {
				builder.append(listItem, children)
			}

			context.parsingContainer = false

			return listItem
		}

		return false
	}

	setNumberList(container) {
		return (event, { builder, restoreSelection }) => {
			const list = new List('number')
			const listItem = new ListItem()

			builder.append(list, listItem)
			builder.replace(container, list)
			restoreSelection()
		}
	}

	setMarkerList(container) {
		return (event, { builder, restoreSelection }) => {
			const list = new List('marker')
			const listItem = new ListItem()

			builder.append(list, listItem)
			builder.replace(container, list)
			restoreSelection()
		}
	}
}

module.exports.ListPlugin = ListPlugin
module.exports.List = List
module.exports.ListItem = ListItem
