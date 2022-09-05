import PluginPlugin from './plugin'
import Container from '../nodes/container'
import Group from '../nodes/group'
import createElement from '../utils/create-element'

export class List extends Group {
	constructor(attributes = { decor: 'marker' }) {
		super('list', attributes)

		this.isDeleteEmpty = true
		this.setElement(createElement(this.attributes.decor === 'numerable' ? 'ol' : 'ul'))
	}

	normalize(element, builder) {
		if (this.attributes.decor === element.attributes.decor) {
			const list = new List(this.attributes)

			builder.append(list, this.first)
			builder.append(list, element.first)

			return list
		}
	}

	stringify(children) {
		const tagName = this.attributes.decor === 'numerable' ? 'ol' : 'ul'

		return '<' + tagName + '>' + children + '</' + tagName + '>'
	}

	json(children) {
		return {
			type: this.type,
			decor: this.attributes.decor,
			body: children
		}
	}
}

export class ListItemContent extends Container {
	constructor() {
		super('list-item-content')

		this.setElement(createElement('div'))
	}

	delete({ builder }) {
		const list = this.parent.parent

		if (this.next && this.next.type === 'list') {
			builder.connect(this.parent, this.next.first)
		}

		builder.cut(this.parent)

		if (list.type === 'list' && !list.first) {
			builder.cut(list)
		}
	}

	backspaceHandler(event, {
		builder,
		anchorContainer,
		anchorAtFirstPositionInContainer,
		setSelection
	}) {
		const item = this.parent
		const parent = item.parent

		if (anchorAtFirstPositionInContainer) {
			event.preventDefault()

			if (parent.parent.type === 'list-item') {
				this.indentLeft(event, { builder, anchorContainer, setSelection })
			} else if (parent.parent.isSection) {
				this.putEmptyBlockInMiddle(builder, setSelection)
			}
		}
	}

	enterHandler(event, {
		builder,
		setSelection,
		anchorContainer,
		anchorOffset
	}) {
		event.preventDefault()

		const item = this.parent
		const parent = item.parent

		if (event.shiftKey) {
			event.preventDefault()

			builder.insert(this, builder.create('breakLine'), anchorOffset)
			setSelection(anchorContainer, anchorOffset + 1)
		} else if (anchorContainer.isEmpty) {
			if (parent.parent.type === 'list-item') {
				this.indentLeft(event, { anchorContainer, setSelection, builder })
			} else if (parent.parent.isSection) {
				this.putEmptyBlockInMiddle(builder, setSelection)
			}
		} else {
			const nextItem = builder.create('list', 'item')
			const content = builder.create('list', 'content')

			builder.append(nextItem, content)
			builder.connect(item, nextItem)
			builder.moveTail(this, content, anchorOffset)

			setSelection(nextItem)
		}
	}

	deleteHandler(event, { builder, anchorContainer, focusAtLastPositionInContainer, setSelection }) {
		if (focusAtLastPositionInContainer) {
			event.preventDefault()

			const nextSelectableNode = anchorContainer.getNextSelectableNode()

			if (!nextSelectableNode) {
				return false
			}

			if (nextSelectableNode.isContainer) {
				const offset = anchorContainer.getOffset()

				if (!nextSelectableNode.hasOnlyBr) {
					builder.append(anchorContainer, nextSelectableNode.first)
				}

				if (nextSelectableNode.parent.isSection) {
					builder.cut(nextSelectableNode)
				} else if (typeof nextSelectableNode.delete === 'function') {
					nextSelectableNode.delete({ builder })
				}

				setSelection(anchorContainer, offset)
			} else if (nextSelectableNode.isWidget) {
				setSelection(nextSelectableNode)
			}
		}
	}

	indentLeft(event, { builder, anchorContainer, setSelection }) {
		const item = anchorContainer.parent

		if (item.next) {
			const list = builder.create('list', { decor: item.parent.attributes.decor })

			builder.append(list, item.next)
			builder.append(item, list)
		}

		const parent = item.parent
		builder.connect(parent.parent, item)

		if (!parent.first) {
			builder.cut(parent)
		}

		setSelection(anchorContainer)
	}

	indentRight(event, { builder, anchorContainer, setSelection }) {
		const item = anchorContainer.parent
		let list

		if (item.previous.last.type === 'list') {
			list = item.previous.last
		} else {
			list = builder.create('list', { decor: item.parent.attributes.decor })
		}

		builder.append(item.previous, list)
		builder.push(list, item)
		setSelection(anchorContainer)
	}

	putEmptyBlockInMiddle(builder, setSelection) {
		const item = this.parent
		const parent = item.parent
		const newBlock = builder.createBlock()
		const last = item.last
		const next = item.next

		builder.connect(parent, newBlock)

		if (this.first) {
			builder.append(newBlock, this.first)
		}

		builder.cut(item)

		if (next) {
			const ul = builder.create('list', parent.attributes)

			builder.append(ul, next)
			builder.connect(newBlock, ul)
		}

		if (!parent.first) {
			builder.cut(parent)
		}

		if (last && last.type === 'list') {
			builder.connect(newBlock, last)
		}

		setSelection(newBlock)
	}

	duplicate(builder) {
		const duplicate = builder.create('list', 'content')

		builder.connect(this, duplicate)

		return duplicate
	}

	stringify(children) {
		return children
	}
}

export class ListItem extends Group {
	constructor() {
		super('list-item')

		this.setElement(createElement('li'))
	}

	duplicate(builder) {
		const duplicate = builder.create('list', 'item')

		builder.connect(this, duplicate)

		return duplicate
	}

	stringify(children) {
		return '<li>' + children + '</li>'
	}
}

export default class ListPlugin extends PluginPlugin {
	create(params) {
		if (params === 'item') {
			return new ListItem()
		}

		if (params === 'content') {
			return new ListItemContent()
		}

		return new List(params)
	}

	get icons() {
		return {
			marked: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M4 4H15V5H4V4ZM4 6H12V7H4V6Z" fill="#fff"/>\
<path fill-rule="evenodd" clip-rule="evenodd" d="M4 9H14V10H4V9ZM4 11H11V12H4V11Z" fill="#fff"/>\
<circle cx="2" cy="5" r="1" fill="#fff"/>\
<circle cx="2" cy="10" r="1" fill="#fff"/>\
</svg>',
			numerated: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M4.5 3H3L1.08398 4.62598L1.91603 5.87405L3 4.98302V10.5H4.5V3.75V3ZM22.5 4.5H9V6H22.5V4.5ZM18.4091 7.5H9V9H18.4091V7.5ZM21.1364 13.5H9V15H21.1364V13.5ZM17.0455 16.5H9V18H17.0455V16.5ZM2.25 14.25C3 14.25 3 14.2507 3 14.2507L2.99999 14.2527L2.99998 14.2549L2.99995 14.2581C2.99995 14.2581 3.00028 14.2494 3.00102 14.239C3.00253 14.2179 3.0059 14.1829 3.01323 14.1389C3.02848 14.0474 3.05759 13.9369 3.10832 13.8354C3.15758 13.7369 3.2197 13.6612 3.29884 13.6084C3.37328 13.5588 3.50624 13.5 3.75 13.5C4.07679 13.5 4.26338 13.5376 4.36325 13.5736C4.40999 13.5904 4.43179 13.6047 4.43919 13.6102C4.44304 13.613 4.4454 13.6156 4.4454 13.6156C4.4454 13.6156 4.46784 13.6481 4.48288 13.7633C4.49879 13.8851 4.5 14.031 4.5 14.25C4.5 14.3996 4.41356 14.6682 4.15721 15.0527C3.91423 15.4172 3.57705 15.7998 3.21967 16.1572C2.86542 16.5114 2.50847 16.824 2.23861 17.0488C2.10421 17.1608 1.99268 17.25 1.91554 17.3107C1.877 17.3409 1.84713 17.364 1.82737 17.3792L1.80553 17.3958L1.79976 17.4002L1.5 17.625V19.5H6V18H3.43601C3.68848 17.7819 3.98365 17.5145 4.28033 17.2178C4.67295 16.8252 5.08577 16.364 5.40529 15.8848C5.71144 15.4255 6 14.8504 6 14.25L6 14.2288C6.00004 14.037 6.0001 13.7976 5.97025 13.569C5.93841 13.3252 5.8664 13.0335 5.6796 12.7631C5.27553 12.1781 4.57095 12 3.75 12C3.24376 12 2.81422 12.1287 2.46679 12.3603C2.12405 12.5888 1.90492 12.8881 1.76668 13.1646C1.62991 13.4381 1.56527 13.7026 1.53364 13.8923C1.51753 13.989 1.50919 14.0712 1.50484 14.1321C1.50265 14.1627 1.50144 14.1883 1.50078 14.2082L1.50014 14.2336L1.50003 14.243L1.50001 14.2468L1.5 14.2492C1.5 14.2492 1.5 14.25 2.25 14.25Z" fill="white"/>\
</svg>',
			indentLeft: '<svg width="16" height="15" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M1.439 0H0v15h1.439V0ZM9.712 15l1.076-1.06-5.697-5.81h10.326V6.718H5.091l5.697-5.504L9.712 0l-5.41 5.371a3 3 0 0 0 0 4.258L9.712 15Z" fill="#000"/>\
</svg>',
			indentRight: '<svg width="16" height="15" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M13.978 15h1.439V0h-1.439v15ZM5.705 0 4.629 1.06l5.697 5.81H0v1.413h10.325L4.63 13.787 5.705 15l5.41-5.371a3 3 0 0 0 0-4.258L5.704 0Z" fill="#000"/>\
</svg>'
		}
	}

	getInsertControls(container) {
		if (container.parent.isSection) {
			return [
				{
					slug: 'list.createMarked',
					label: 'Добавить маркированный спискок',
					icon: 'marked',
					action: this.setMarkerList(container)
				},
				{
					slug: 'list.createNumerated',
					label: 'Добавить нумерованный список',
					icon: 'numerated',
					action: this.setNumberList(container)
				}
			]
		}

		return []
	}

	getReplaceControls(container) {
		const controls = []

		if (container.type === 'list-item-content') {
			if (container.parent.parent.parent.type === 'list-item') {
				controls.push({
					slug: 'list.indentLeft',
					label: 'На один уровень влево',
					icon: 'indentLeft',
					action: container.indentLeft
				})
			}

			if (container.parent.previous) {
				controls.push({
					slug: 'list.indentRight',
					label: 'На один уровень вправо',
					icon: 'indentRight',
					action: container.indentRight
				})
			}
		}

		return controls
	}

	parse(element, builder, context) {
		const nodeName = element.nodeName.toLowerCase()

		if (element.nodeType === 1 && (nodeName === 'ul' || nodeName === 'ol')) {
			const decor = nodeName === 'ul' ? 'marker' : 'numerable'
			const list = builder.create('list', { decor })
			let children

			if (children = builder.parse(element.firstChild, element.lastChild, context)) {
				builder.append(list, children)
			}

			return list
		}

		if (element.nodeType === 1 && nodeName === 'li') {
			const listItem = builder.create('list', 'item')
			const content = builder.create('list', 'content')
			let children

			context.parsingContainer = true

			if (children = builder.parse(element.firstChild, element.lastChild, context)) {
				const last = children.getLastNode()

				builder.append(listItem, content)
				builder.append(content, children)

				if (last.type === 'list') {
					builder.connect(content, last)
				}
			}

			context.parsingContainer = false

			return listItem
		}

		return false
	}

	parseJson(element, builder) {
		if (element.type === 'list') {
			const list = builder.create('list', { decor: element.decor })
			let children

			if (children = builder.parseJson(element.body)) {
				builder.append(list, children)
			}

			return list
		}

		if (element.type === 'list-item') {
			const item = builder.create('list', 'item')
			let children

			if (children = builder.parseJson(element.body)) {
				builder.append(item, children)
			}

			return item
		}

		if (element.type === 'list-item-content') {
			const content = builder.create('list', 'content')
			let children

			if (children = builder.parseJson(element.body)) {
				builder.append(content, children)
			}

			return content
		}

		return false
	}

	setNumberList(container) {
		return (event, { builder }) => {
			const list = builder.create('list', { decor: 'numerable' })
			const listItem = builder.create('list', 'item')

			const content = builder.create('list', 'content')

			builder.append(listItem, content)
			builder.append(list, listItem)
			builder.replace(container, list)
		}
	}

	setMarkerList(container) {
		return (event, { builder }) => {
			const list = builder.create('list', { decor: 'marker' })
			const listItem = builder.create('list', 'item')
			const content = builder.create('list', 'content')

			builder.append(listItem, content)
			builder.append(list, listItem)
			builder.replace(container, list)
		}
	}
}
