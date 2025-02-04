import PluginPlugin from './plugin.js'
import Widget from '../nodes/widget.js'
import Container from '../nodes/container.js'
import Section from '../nodes/section.js'
import findLastNode from '../utils/find-last.js'

export class List extends Section {
	constructor(attributes = { decor: 'marker' }) {
		super('list', attributes)
	}

	render(body) {
		return {
			type: this.attributes.decor === 'numerable' ? 'ol' : 'ul',
			attributes: {},
			body
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

export class ListItem extends Widget {
	constructor() {
		super('list-item')
	}

	render(body) {
		return {
			type: 'li',
			attributes: {},
			body
		}
	}

	split(builder, next) {
		const duplicate = builder.create(this.type)

		builder.append(this.parent, duplicate, this.next)
		builder.append(duplicate, next)

		return {
			head: this,
			tail: duplicate
		}
	}

	stringify(children) {
		return '<li>' + children + '</li>'
	}
}

export class ListItemContent extends Container {
	constructor() {
		super('list-item-content')
	}

	render(body) {
		return {
			type: 'div',
			attributes: {
				tabIndex: 0
			},
			body
		}
	}

	split(builder, next) {
		const item = builder.create('list-item')
		const content = builder.create('list-item-content')

		builder.append(item, content)
		builder.append(content, next)

		if (this.parent.last.type === 'list') {
			builder.append(item, this.parent.last)
		}

		builder.append(this.parent.parent, item, this.parent.next)

		return {
			head: this.parent,
			tail: item
		}
	}

	onCombine(builder, container) {
		if (this.parent.last.type === 'list') {
			if (container.parent.type === 'list-item') {
				builder.append(container.parent, this.parent.last)
			} else {
				builder.append(this.parent.parent, this.parent.last.first, this.parent.next)
			}
		}

		builder.cut(this.parent)
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

			builder.insert(builder.create('breakLine'))
		} else if (anchorContainer.isEmpty) {
			if (parent.parent.type === 'list-item') {
				this.indentLeft(event, { anchorContainer, setSelection, builder })
			} else if (parent.parent.isSection) {
				this.convertListItemToBlock(event, { focusedNodes, builder, setSelection })
			}
		} else {
			const nextItem = builder.create('list-item')
			const content = builder.create('list-item-content')

			builder.append(nextItem, content)
			builder.append(item.parent, nextItem, item.next)
			builder.moveTail(this, content, anchorOffset)

			if (this.next && this.next.type === 'list') {
				builder.append(nextItem, this.next)
			}
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

	deleteHandler(event, { builder, anchorContainer, focusAtLastPositionInContainer }) {
		if (focusAtLastPositionInContainer) {
			event.preventDefault()

			const nextSelectableNode = anchorContainer.getNextSelectableNode()

			if (!nextSelectableNode) {
				return false
			}

			builder.combine(this, nextSelectableNode)
		}
	}

	indentLeft(event, { builder, anchorContainer, anchorOffset, setSelection }) {
		const item = anchorContainer.parent
		const parentList = item.parent
		let subList

		if (item.next) {
			subList = builder.create('list', { decor: item.parent.attributes.decor })
			builder.append(subList, item.next)
		}

		builder.append(parentList.parent.parent, item, parentList.parent.next)
		builder.append(item, subList)

		if (!parentList.first) {
			builder.cut(parentList)
		}

		setSelection(anchorContainer, anchorOffset)
	}

	indentRight(event, { builder, anchorContainer, anchorOffset, setSelection }) {
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

		setSelection(anchorContainer, anchorOffset)
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

				builder.append(newBlock, container.first)
				builder.cut(item)

				while (['list', 'list-item', 'list-item-content'].includes(parentSection.type)) {
					parentNext = parentSection.next
					parentSection = parentSection.parent

					if (next && parentSection.type === 'list') {
						parentList = next.parent
						builder.append(parentSection, next, parentNext)
					}

					if (!parentList.first) {
						builder.cut(parentList)
					}

					if (!next && parentNext) {
						next = parentNext
					}
				}

				builder.append(parentSection, newBlock, parentNext)

				if (next && next.type === 'list-item') {
					const ul = builder.create('list', next.parent.attributes)

					builder.append(ul, next)
					builder.append(newBlock.parent, ul, newBlock.next)
				}

				setSelection(newBlock)
			}
		})
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
		super(params)

		this.setList = this.setList.bind(this)
		this.normalize = this.normalize.bind(this)
	}

	get icons() {
		return {
			marked: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 17h10M9 12h10M9 7h10M5.002 17v.002H5V17h.002Zm0-5v.002H5V12h.002Zm0-5v.002H5V7h.002Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			numerated: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 17h10M4 15.685V15.5A1.5 1.5 0 0 1 5.5 14h.04c.807 0 1.46.653 1.46 1.46 0 .35-.114.692-.324.972L4 20h3m3-8h10M10 7h10M4 5l2-1v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			indentLeft: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 18V6m18 6H7m0 0 5-5m-5 5 5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			indentRight: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 18V6M3 12h14m0 0-5-5m5 5-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
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

				if (listItemContents[0].parent.previous && (!this.params.maxDepth || this.getDepth(listItemContents[0].parent) < this.params.maxDepth)) {
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

	parseJson(element, builder) {
		if (element.type === 'list') {
			return builder.create('list', { decor: element.decor })
		}

		if (element.type === 'list-item') {
			return builder.create('list-item')
		}

		if (element.type === 'list-item-content') {
			return builder.create('list-item-content')
		}
	}

	parseTree(element, builder) {
		if (element.type === 'ul' || element.type === 'ol') {
			return builder.create('list', { decor: element.type === 'ol' ? 'numerable' : 'marker' })
		}

		if (element.type === 'li') {
			const listItem =  builder.create('list-item')
			const content = builder.create('list-item-content')
			const children = builder.parseVirtualTree(element.body)

			builder.append(listItem, content)
			builder.append(content, children.first)

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
		return (event, { builder, setSelection, focusedNodes, anchorOffset, focusOffset }) => {
			const containers = focusedNodes.filter((node) => node.isContainer && node.parent.isSection)
			let since
			let until
			let previous
			let group = []

			function convertGroup(group) {
				if (group.length) {
					const list = builder.create('list', { decor: type })

					builder.append(group[0].parent, list, group[0])
					group.forEach((node) => {
						const listItem = builder.create('list-item')
						const content = builder.create('list-item-content')

						builder.append(listItem, content)
						builder.append(list, listItem)
						builder.moveTail(node, content, 0)
						builder.cut(node)
						until = content

						if (!since) {
							since = content
						}
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
			setSelection(since, anchorOffset, until, focusOffset)
		}
	}

	normalize(node, builder) {
		const { params } = this
		const parent = node.parent

		if (node.type === 'list') {
			if (node.previous && node.previous.type === 'list') {
				const previous = node.previous

				builder.append(previous, node.first)
				builder.cut(node)

				return previous
			}

			if (!node.first) {
				builder.cut(node)

				return node
			}

			if (this.params.maxDepth && this.getDepth(node) > this.params.maxDepth) {
				const first = node.first

				builder.append(parent.parent, first, parent.next)
				builder.cut(node)

				return first
			}
		}

		// root
		//   list-item
		//     list-item-content
		//       text
		// →
		// root
		//   list
		//     list-item
		//       list-item-content
		//         text
		if (node.type === 'list-item' && parent.isSection && parent.type !== 'list') {
			const list = builder.create('list', params)
			const last = findLastNode(node, (item) => item.type === 'list-item')

			builder.wrap(node, list, last)

			return list
		}

		if (parent.type === 'list') {
			// list
			//   paragraph
			//     text
			// →
			// list
			//   list-item
			//     list-item-content
			//       text
			if (node.isContainer && node.type !== 'list-item') {
				const listItem = builder.create('list-item')
				const content = builder.create('list-item-content')

				builder.append(content, node.first)
				builder.append(listItem, content)
				builder.replace(node, listItem)

				return listItem
			}

			// list
			//   image
			// →
			// image

			// list
			//   list-item
			//   image
			// →
			// list
			//   list-item
			// image

			// list
			//   image
			//   list-item
			// →
			// image
			// list
			//   list-item

			// list
			//   list-item
			//   image
			//   list-item
			// →
			// list
			//   list-item
			// image
			// list
			//   list-item
			if (node.type !== 'list-item') {
				if (node.next) {
					const list = builder.create('list', params)

					builder.append(list, node.next)
					builder.append(parent.parent, list, parent.next)
				}

				builder.push(parent.parent, node, parent.next)
				builder.cutEmpty(parent)

				return node
			} else if (!node.first) {
				const content = builder.create('list-item-content')

				builder.append(content, node.first)
				builder.append(node, content)

				return content
			}
		}

		// list-item
		//   paragraph
		//     text
		// →
		// list-item
		//   list-item-content
		//     text

		// list-item
		//   image
		//   list-item-content
		// →
		// image
		// list
		//   list-item-content

		// list-item
		//   list
		//     list-item
		// →
		// list-item
		// list-item

		// list-item
		//   list-item-content
		//   list
		//    list-item
		//   list
		//     list-item
		// →
		// list-item
		//   list-item-content
		//   list
		//     list-item
		// list
		//   list-item
		if (parent.type === 'list-item') {
			if (node === parent.first && node.isContainer && node.type !== 'list-item-content') {
				const content = builder.create('list-item-content')

				builder.convert(node, content)

				return content
			}

			if (
				node === parent.first && node.type !== 'list-item-content' ||
				parent.first && node === parent.first.next && node.type !== 'list' ||
				parent.first && parent.first.next && node === parent.first.next.next
			) {
				builder.append(parent.parent, node, parent.next)
				builder.cutEmpty(parent)

				return node
			}
		}

		// list
		//   list-item
		//     list-item-content
		//       text
		//       image
		// →
		// list
		//   list-item
		//     list-item-content
		//       text
		//   image
		if (parent.type === 'list-item-content' && node.type !== 'text' && !node.isInlineWidget) {
			if (node.type === 'list') {
				builder.append(parent.parent, node, parent.next)

				return node
			}

			const duplicated = parent.split(builder)

			builder.append(parent.parent.parent, node, duplicated.tail)

			if (!duplicated.tail.length) {
				builder.cut(duplicated.tail)
			}

			return node
		}

		// root
		//   paragraph
		//   list-item-content
		//   header
		// →
		// root
		//   paragraph
		//   paragraph
		//   header
		if (node.type === 'list-item-content' && parent.type !== 'list-item') {
			const block = builder.createBlock()

			builder.convert(node, block)

			return block
		}

		return false
	}

	getDepth(container) {
		let current = container
		let depth = 1

		while (current) {
			if (current.type === 'list-item') {
				depth++
			}

			current = current.parent
		}

		return depth
	}
}
