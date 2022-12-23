import PluginPlugin from './plugin'
import Container from '../nodes/container'
import Group from '../nodes/group'
import createElement from '../utils/create-element'
import isHtmlElement from '../utils/is-html-element'

export class List extends Group {
	constructor(attributes = { decor: 'marker' }) {
		super('list', attributes)

		this.isDeleteEmpty = true
	}

	render() {
		return createElement(this.attributes.decor === 'numerable' ? 'ol' : 'ul')
	}

	accept(node) {
		return node.type === 'list-item'
	}

	normalize(element, builder) {
		if (element.type !== 'list') {
			return false
		}

		if (this.attributes.decor === element.attributes.decor) {
			return builder.create('list', { decor: this.attributes.decor })
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

export class ListItem extends Group {
	constructor() {
		super('list-item')
	}

	render() {
		return createElement('li')
	}

	append(target, anchor, { builder, appendDefault }) {
		if (target.isContainer && target.type !== 'list-item-content') {
			builder.append(this.first, target.first, anchor)
		} else if (target.type === 'text' || target.isInlineWidget) {
			builder.append(this.first, target)
		} else if (!this.first && target.type === 'list' && target.first && target.first.first) {
			appendDefault(this, target.first.first, anchor)
			builder.cut(target)
		} else {
			appendDefault(this, target, anchor)
		}
	}

	accept(node) {
		if (node.type === 'list' && this.last && this.last.type === 'list-item-content') {
			return true
		}

		return node.isContainer || node.type === 'text' || node.isInlineWidget
	}

	duplicate(builder) {
		return builder.create('list', 'item')
	}

	stringify(children) {
		return '<li>' + children + '</li>'
	}
}

export class ListItemContent extends Container {
	constructor() {
		super('list-item-content')
	}

	render() {
		return createElement('div', {
			tabIndex: 0
		})
	}

	cut({ builder }) {
		if (this.parent && this.parent.parent) {
			const list = this.parent.parent

			if (this.next && this.next.type === 'list') {
				builder.append(list, this.next.first, this.parent.next)
			}

			builder.cut(this.parent)

			if (list.type === 'list' && !list.first) {
				builder.cut(list)
			}
		} else {
			builder.cutUntil(this, this)
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
			builder.append(item.parent, nextItem, item.next)
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

				builder.cut(nextSelectableNode)

				setSelection(anchorContainer, offset)
			} else if (nextSelectableNode.isWidget) {
				setSelection(nextSelectableNode)
			}
		}
	}

	indentLeft(event, { builder, anchorContainer, setSelection }) {
		const item = anchorContainer.parent
		const parentList = item.parent

		if (item.next) {
			const list = builder.create('list', { decor: item.parent.attributes.decor })

			builder.append(list, item.next)
			builder.append(item, list)
		}

		builder.append(parentList.parent.parent, item, parentList.parent.next)

		if (!parentList.first) {
			builder.cut(parentList)
		}

		setSelection(anchorContainer)
	}

	indentRight(event, { builder, anchorContainer, setSelection }) {
		const item = anchorContainer.parent
		let list

		if (item.previous.last.type === 'list') {
			list = item.previous.last
			builder.push(list, item)
		} else {
			list = builder.create('list', { decor: item.parent.attributes.decor })
			builder.append(item.previous, list)
			builder.push(list, item)
		}

		setSelection(anchorContainer)
	}

	putEmptyBlockInMiddle(builder, setSelection) {
		const item = this.parent
		const parentList = item.parent
		const newBlock = builder.createBlock()
		const last = item.last
		const next = item.next

		builder.append(parentList.parent, newBlock, parentList.next)

		if (this.first) {
			builder.append(newBlock, this.first)
		}

		builder.cut(item)

		if (next) {
			const ul = builder.create('list', parent.attributes)

			builder.append(ul, next)
			builder.append(newBlock.parent, ul, newBlock.next)
		}

		if (!parentList.first) {
			builder.cut(parentList)
		}

		if (last && last.type === 'list') {
			builder.append(newBlock.parent, last, newBlock.next)
		}

		setSelection(newBlock)
	}

	duplicate(builder) {
		return builder.create('list', 'content')
	}

	stringify(children) {
		return children
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
			marked: '<svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 17h10M9 12h10M9 7h10M5.002 17v.002H5V17h.002Zm0-5v.002H5V12h.002Zm0-5v.002H5V7h.002Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			numerated: '<svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 17h10M4 15.685V15.5A1.5 1.5 0 0 1 5.5 14h.04c.807 0 1.46.653 1.46 1.46 0 .35-.114.692-.324.972L4 20h3m3-8h10M10 7h10M4 5l2-1v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			indentLeft: '<svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 18V6m18 6H7m0 0 5-5m-5 5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			indentRight: '<svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 18V6M3 12h14m0 0-5-5m5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
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

	parse(element, builder) {
		const nodeName = isHtmlElement(element) ? element.nodeName.toLowerCase() : ''

		if (nodeName === 'ul' || nodeName === 'ol') {
			const decor = nodeName === 'ul' ? 'marker' : 'numerable'

			return builder.create('list', { decor })
		}

		if (nodeName === 'li') {
			const listItem = builder.create('list', 'item')
			const content = builder.create('list', 'content')

			builder.append(listItem, content)

			return listItem
		}
	}

	parseJson(element, builder) {
		if (element.type === 'list') {
			return builder.create('list', { decor: element.decor })
		}

		if (element.type === 'list-item') {
			return builder.create('list', 'item')
		}

		if (element.type === 'list-item-content') {
			return builder.create('list', 'content')
		}
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
