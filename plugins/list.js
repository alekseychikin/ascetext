import PluginPlugin from './plugin.js'
import Node from '../nodes/node.js'
import Container from '../nodes/container.js'
import Group from '../nodes/group.js'
import createElement from '../utils/create-element.js'
import isHtmlElement from '../utils/is-html-element.js'

export class List extends Group {
	constructor(attributes = { decor: 'marker' }) {
		super('list', attributes)

		this.isDeleteEmpty = true
	}

	render() {
		return {
			type: this.attributes.decor === 'numerable' ? 'ol' : 'ul',
			attributes: {},
			body: []
		}
	}

	accept(node) {
		return node.type === 'list-item'
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

export class ListItem extends Node {
	constructor(params = {}) {
		super('list-item')

		this.params = params
	}

	render() {
		return {
			type: 'li',
			attributes: {},
			body: []
		}
	}

	append(target, anchor, { builder, appendDefault }) {
		if (target.type === 'text' || target.isInlineWidget) {
			builder.append(this.first, target)
		} else if (!this.first && target.type === 'list' && target.first && target.first.first) {
			appendDefault(this, target.first.first, anchor)
			builder.cut(target)
		} else {
			appendDefault(this, target, anchor)
		}
	}

	wrapper() {
		return new List()
	}

	accept(node) {
		if (node.type === 'list' && this.last && this.last.type === 'list-item-content') {
			if (this.params.maxDepth !== null) {
				const depth = this.getDepth(this, node)

				if (depth > this.params.maxDepth) {
					return false
				}
			}

			return true
		}

		return node.type === 'list-item-content' || node.type === 'text' || node.isInlineWidget
	}

	getDepth(container, node) {
		let current = container
		let depth = 0

		while (current) {
			if (current.type === 'list-item') {
				depth++
			}

			current = current.parent
		}

		current = node

		while (current) {
			if (current.type === 'list-item') {
				depth++
			}

			current = current.last
		}

		return depth
	}

	duplicate(builder) {
		return builder.create('list-item', this.params)
	}

	stringify(children) {
		return '<li>' + children + '</li>'
	}
}

export class ListItemContent extends Container {
	constructor(params = {}) {
		super('list-item-content')

		this.params = params
	}

	render() {
		return {
			type: 'div',
			attributes: {
				tabIndex: 0
			},
			body: []
		}
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
		setSelection,
		focusedNodes
	}) {
		const item = this.parent
		const parent = item.parent

		if (anchorAtFirstPositionInContainer) {
			event.preventDefault()

			if (parent.parent.type === 'list-item') {
				this.indentLeft(event, { builder, anchorContainer, setSelection })
			} else if (parent.parent.isSection) {
				this.convertListItemToBlock(event, { focusedNodes, builder, setSelection })
			}
		}
	}

	enterHandler(event, {
		builder,
		setSelection,
		anchorContainer,
		anchorOffset,
		focusedNodes
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
				this.convertListItemToBlock(event, { focusedNodes, builder, setSelection })
			}
		} else {
			const nextItem = builder.create('list-item', this.params)
			const content = builder.create('list-item-content', this.params)

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

				// if (!nextSelectableNode.hasOnlyBr) {
				// 	builder.append(anchorContainer, nextSelectableNode.first)
				// }

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
		let subList

		if (item.next) {
			subList = builder.create('list', { decor: item.parent.attributes.decor })
			builder.append(subList, item.next)
		}

		builder.append(parentList.parent.parent, item, parentList.parent.next)

		if (subList) {
			builder.append(item, subList)
		}

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

	convertListItemToBlock(event, { builder, setSelection, focusedNodes }) {
		focusedNodes.forEach((container) => {
			if (container.type === 'list-item-content') {
				const item = container.parent
				const newBlock = builder.createBlock()
				let parentList = item.parent
				let parentSection = item.parent
				let parentNext = item.next
				let next = item.next

				if (item.last && item.last.type === 'list') {
					builder.append(parentList, item.last.first, item.next)
					builder.cut(item.last)
					next = item.next
				}

				if (container.first) {
					builder.append(newBlock, container.first)
				}

				builder.cut(item)

				while (!parentSection.isSection) {
					parentNext = parentSection.next
					parentSection = parentSection.parent

					if (next && parentSection.type === 'list') {
						parentList = next.parent
						builder.append(parentSection, next, parentNext)
					}

					if (!parentList.first) {
						builder.cut(parentList)
					}

					if (!next && parentNext && !parentSection.isSection) {
						next = parentNext
					}
				}

				builder.append(parentSection, newBlock, parentNext)

				if (next) {
					const ul = builder.create('list', next.parent.attributes)

					builder.append(ul, next)
					builder.append(newBlock.parent, ul, newBlock.next)
				}

				setSelection(newBlock)
			}
		})
	}

	duplicate(builder) {
		return builder.create('list-item-content', this.params)
	}

	stringify(children) {
		return children
	}
}

export default class ListPlugin extends PluginPlugin {
	get register() {
		return {
			'list': List,
			'list-item': ListItem,
			'list-item-content': ListItemContent
		}
	}

	constructor(params = { maxDepth: null }) {
		super()

		this.setList = this.setList.bind(this)

		this.params = params
	}

	get icons() {
		return {
			marked: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 17h10M9 12h10M9 7h10M5.002 17v.002H5V17h.002Zm0-5v.002H5V12h.002Zm0-5v.002H5V7h.002Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			numerated: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 17h10M4 15.685V15.5A1.5 1.5 0 0 1 5.5 14h.04c.807 0 1.46.653 1.46 1.46 0 .35-.114.692-.324.972L4 20h3m3-8h10M10 7h10M4 5l2-1v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			indentLeft: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 18V6m18 6H7m0 0 5-5m-5 5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			indentRight: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 18V6M3 12h14m0 0-5-5m5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
		}
	}

	getInsertControls(container) {
		if (container.parent.isSection) {
			return [
				{
					slug: 'list.createMarked',
					label: 'Bullet-point list',
					icon: 'marked',
					action: this.setList('marker')
				},
				{
					slug: 'list.createNumerated',
					label: 'Ordered list',
					icon: 'numerated',
					action: this.setList('numerable')
				}
			]
		}

		return []
	}

	getReplaceControls(focusedNodes) {
		const containers = focusedNodes.filter((node) => node.isContainer && node.parent.isSection)
		const listItemContents = focusedNodes.filter((node) => node.type === 'list-item-content')
		const types = listItemContents.reduce((result, node) => {
			const { decor } = node.parent.parent.attributes

			if (!result.includes(decor)) {
				result.push(decor)
			}

			return result
		}, [])
		const controls = []

		if (types.length > 1) {
			controls.push({
				slug: 'list.uncreateMarked',
				label: 'Ordered list',
				icon: 'marked',
				selected: true,
				action: this.convertNumberList
			})
			controls.push({
				slug: 'list.uncreateNumerated',
				label: 'Bullet-point list',
				icon: 'numerated',
				selected: true,
				action: this.convertMarkerList
			})
		} else if (types.length === 1) {
			if (types[0] === 'marker') {
				controls.push({
					slug: 'list.uncreateMarked',
					label: 'Bullet-point list',
					icon: 'marked',
					selected: true,
					action: listItemContents[0].convertListItemToBlock
				})
				controls.push({
					slug: 'list.uncreateMarked',
					label: 'Ordered list',
					icon: 'numerated',
					action: this.convertNumberList
				})
			} else {
				controls.push({
					slug: 'list.uncreateMarked',
					label: 'Bullet-point list',
					icon: 'marked',
					action: this.convertMarkerList
				})
				controls.push({
					slug: 'list.uncreateMarked',
					label: 'Ordered list',
					icon: 'numerated',
					selected: true,
					action: listItemContents[0].convertListItemToBlock
				})
			}
		} else if (containers.length) {
			controls.push({
				slug: 'list.createMarked',
				label: 'Bullet-point list',
				icon: 'marked',
				action: this.setList('marker')
			})
			controls.push({
				slug: 'list.createNumerated',
				label: 'Ordered list',
				icon: 'numerated',
				action: this.setList('numerable')
			})
		}

		if (listItemContents.length === 1) {
			if (listItemContents[0].type === 'list-item-content') {
				if (listItemContents[0].parent.parent.parent.type === 'list-item') {
					controls.push({
						slug: 'list.indentLeft',
						label: 'Indent left',
						shortcut: 'ctrl+[/meta+[',
						icon: 'indentLeft',
						action: listItemContents[0].indentLeft
					})
				}

				if (listItemContents[0].parent.previous && (!this.params.maxDepth || listItemContents[0].parent.getDepth(listItemContents[0].parent) < this.params.maxDepth)) {
					controls.push({
						slug: 'list.indentRight',
						label: 'Indent right',
						shortcut: 'ctrl+]/meta+]',
						icon: 'indentRight',
						action: listItemContents[0].indentRight
					})
				}
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
			const listItem = builder.create('list-item', this.params)
			const content = builder.create('list-item-content', this.params)

			builder.append(listItem, content)

			return listItem
		}
	}

	parseJson(element, builder) {
		if (element.type === 'list') {
			return builder.create('list', { decor: element.decor })
		}

		if (element.type === 'list-item') {
			return builder.create('list-item', this.params)
		}

		if (element.type === 'list-item-content') {
			return builder.create('list-item-content', this.params)
		}
	}

	parseTreeElement(element, builder) {
		if (element.type === 'ul' || element.type === 'ol') {
			return builder.create('list', { decor: element.type === 'ol' ? 'numerable' : 'unordered' })
		}

		if (element.type === 'li') {
			const listItem =  builder.create('list-item', this.params)
			const content = builder.create('list-item-content', this.params)

			builder.append(listItem, content)

			return listItem
		}
	}

	convertNumberList(event, { builder, focusedNodes }) {
		focusedNodes.forEach((node) => {
			if (node.type === 'list-item-content') {
				builder.setAttribute(node.parent.parent, 'decor', 'numerable')
			}
		})
	}

	convertMarkerList(event, { builder, focusedNodes }) {
		focusedNodes.forEach((node) => {
			if (node.type === 'list-item-content') {
				builder.setAttribute(node.parent.parent, 'decor', 'marker')
			}
		})
	}

	setList(type) {
		return (event, { builder, focusedNodes }) => {
			const containers = focusedNodes.filter((node) => node.isContainer && node.parent.isSection)
			const { params } = this
			let previous
			let group = []

			function convertGroup(group) {
				if (group.length) {
					const list = builder.create('list', { decor: type })

					builder.append(group[0].parent, list, group[0])
					group.forEach((node) => {
						const listItem = builder.create('list-item', params)
						const content = builder.create('list-item-content', params)

						builder.append(content, node.first)
						builder.append(listItem, content)
						builder.append(list, listItem)
						builder.cut(node)
					})
				}
			}

			containers.forEach((node) => {
				if (node.previous !== previous) {
					previous = node
					convertGroup(group)
					group = [node]
				} else {
					group.push(node)
					previous = node
				}
			})

			convertGroup(group)
		}
	}
}
