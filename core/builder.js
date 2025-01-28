import Publisher from './publisher.js'
import isFunction from '../utils/is-function.js'
import Fragment from '../nodes/fragment.js'
import findParent from '../utils/find-parent.js'

export const operationTypes = {
	CUT: 'cut',
	APPEND: 'append',
	ATTRIBUTE: 'attribute'
}

export default class Builder extends Publisher {
	constructor(core) {
		super()
		this.core = core

		this.registeredNodes = {}
		this.registerPlugins()
	}

	create(name, ...params) {
		return new this.registeredNodes[name](...params)
	}

	createBlock() {
		return this.create('paragraph')
	}

	createFragment() {
		return new Fragment()
	}

	setAttribute(node, name, value) {
		const previous = { ...node.attributes }

		node.attributes = {
			...node.attributes,
			[name]: value
		}
		this.handleAttributes(node, previous, node.attributes)
	}

	setAttributes(node, attributes) {
		const previous = { ...node.attributes }

		node.attributes = { ...attributes }
		this.handleAttributes(node, previous, attributes)
	}

	handleAttributes(target, previous, next) {
		this.sendMessage({
			type: operationTypes.ATTRIBUTE,
			target,
			previous,
			next
		})
	}

	parseJson(body) {
		const container = this.createFragment()
		let current
		let children

		body.forEach((element) => {
			children = null

			if (element.body) {
				children = this.parseJson(element.body)
			}

			current = this.core.plugins.reduce((parsed, plugin) => {
				if (parsed) return parsed

				return plugin.parseJson(element, this)
			}, false)

			if (current) {
				this.append(container, current)

				if (children && children.first) {
					this.append(current, children)
				}
			} else if (children && children.first) {
				this.append(container, children)
			}
		})

		return container
	}

	getJson(first, last) {
		const content = []
		let children
		let current = first
		let element

		while (current) {
			children = []

			if (current.first) {
				children = this.getJson(current.first)
			}

			element = current.json(children)

			if (element) {
				content.push(element)
			}

			if (current === last) {
				break
			}

			current = current.next
		}

		return content
	}

	parseVirtualTree(tree) {
		const fragment = this.createFragment()
		let currentElement
		let i
		let children = null
		let current

		for (i = 0; i < tree.length; i++) {
			currentElement = tree[i]
			children = null
			current = this.core.plugins.reduce((parsed, plugin) => {
				if (parsed) return parsed

				return plugin.parseTree(currentElement, this)
			}, null)

			if (!current || !current.isWidget && current.type !== 'text') {
				children = this.parseVirtualTree(currentElement.body)
			}

			if (current) {
				this.append(fragment, current)

				if (children) {
					this.append(current, children.first)
				}
			} else if (children) {
				this.append(fragment, children.first)
			}
		}

		return fragment
	}

	splitByOffset(container, offset) {
		let length = offset

		if (!container.first) {
			this.core.normalizer.empty(container, container)
		}

		let firstLevelNode = container.first

		if (!offset) {
			const text = this.create('text', { content: '' })

			this.append(container, text, firstLevelNode)

			return {
				head: text,
				tail: firstLevelNode
			}
		}

		while (firstLevelNode && length > firstLevelNode.length) {
			length -= firstLevelNode.length
			firstLevelNode = firstLevelNode.next
		}

		if (firstLevelNode.type === 'text' || firstLevelNode.type === 'breakLine') {
			return firstLevelNode.split(this, length)
		}

		const { tail } = this.splitByOffset(firstLevelNode, length)
		const duplicate = firstLevelNode.split(this).tail

		this.append(duplicate, tail)

		return {
			head: firstLevelNode,
			tail: duplicate
		}
	}

	splitByTail(parent, tail) {
		let currentTail = tail
		let container = tail.parent
		let duplicate

		while (container !== parent) {
			duplicate = container.split(this, currentTail)
			currentTail = duplicate.tail

			if (duplicate.head.parent.contains(parent)) {
				return {
					head: duplicate.head,
					tail: currentTail
				}
			}

			container = duplicate.head.parent
		}

		return {
			head: tail.previous,
			tail
		}
	}

	async parseFiles(files) {
		return await this.core.plugins.reduce((parsed, plugin) => {
			if (parsed) return parsed

			if (isFunction(plugin.parseFiles)) {
				return plugin.parseFiles(files, this)
			}

			return null
		}, false)

	}

	duplicate(target) {
		return isFunction(target.duplicate)
			? target.duplicate(this)
			: this.create(target.type, { ...target.attributes })
	}

	push(node, target, anchor) {
		this.cut(target)
		this.append(node, target, anchor)
	}

	append(node, target, anchor) {
		if (!target) {
			return
		}

		if (target.type === 'fragment') {
			return this.append(node, target.first, anchor)
		}

		const last = target.getNodeUntil()
		let current = target

		if (anchor && anchor.parent !== node) {
			console.error('anchor is not child of node', anchor)

			return
		}

		this.cutUntil(target, last)

		do {
			current.parent = node
			findParent(current.parent, (parent) => {
				parent.length += current.length
			})

			if (current === last) {
				break
			}

			current = current.next
		} while (current)

		if (!node.first) {
			node.first = target
		} else if (anchor) {
			if (anchor.previous) {
				target.previous = anchor.previous
				anchor.previous.next = target
			} else {
				node.first = target
			}

			last.next = anchor
			anchor.previous = last
		} else {
			node.last.next = target
			target.previous = node.last
		}

		if (!anchor) {
			node.last = last
		}

		this.sendMessage({
			type: operationTypes.APPEND,
			container: node,
			target,
			last,
			anchor
		})
	}

	cut(node) {
		this.cutUntil(node, node)
	}

	cutUntil(node, until) {
		if (!node) {
			return
		}

		const last = node.getNodeUntil(until)
		let current = node

		if (node.parent) {
			this.sendMessage({
				type: operationTypes.CUT,
				container: node.parent,
				last,
				anchor: last.next,
				previous: node.previous,
				next: last.next,
				target: node
			})
		}

		if (current.previous) {
			if (current.parent && current.parent.last === last) {
				current.parent.last = current.previous
			}

			if (last.next) {
				current.previous.next = last.next
				last.next.previous = current.previous
			} else {
				delete current.previous.next
			}
		} else if (last.next) {
			if (current.parent) {
				current.parent.first = last.next
			}

			delete last.next.previous
		} else if (current.parent) {
			delete current.parent.first
			delete current.parent.last
		}

		delete current.previous
		delete last.next

		while (current) {
			findParent(current.parent, (item) => {
				item.length -= current.length
			})
			delete current.parent

			if (current === last) {
				break
			}

			current = current.next
		}
	}

	replace(node, target) {
		this.replaceUntil(node, target, node)
	}

	replaceUntil(node, target, until) {
		const parent = node.parent
		const next = until ? until.next : null

		this.cutUntil(node, until)
		this.append(parent, target, next)
	}


	insertText(target, anchor) {
		let next = target
		let last

		if (target.type === 'text' || target.isInlineWidget) {
			last = target

			while (last) {
				if (last.type !== 'text' && !last.isInlineWidget || !last.next) {
					break
				}

				last = last.next
			}

			next = last.next
			this.cutUntil(target, last)
			this.append(anchor.parent, target, anchor)
		} else if (target.isContainer) {
			next = target.next
			this.cut(target)
			this.append(anchor.parent, target.first, anchor)
		}

		return next
	}

	insert(target) {
		const current = target && target.isFragment ? target.first : target

		if (current) {
			const { selection: { anchorContainer, anchorOffset, setSelection } } = this.core
			const splitted = this.splitByOffset(anchorContainer, anchorOffset)
			const rest = this.insertText(current, splitted.tail)

			if (rest) {
				const { head, tail } = this.splitByTail(anchorContainer.parent, splitted.tail)

				this.append(head.parent, rest, tail)

				if (head.isEmpty && head.parent && head.parent.isSection) {
					this.cut(head)
				}

				if (tail.isEmpty && tail.parent && tail.parent.isSection) {
					const previousSelectable = tail.getPreviousSelectableNode()

					if (previousSelectable) {
						setSelection(previousSelectable)
					}

					this.cut(tail)
				} else {
					setSelection(tail)
				}
			} else {
				setSelection(anchorContainer, this.getOffsetToParent(anchorContainer, splitted.tail))
			}
		}
	}

	getOffsetToParent(parent, target) {
		let offset = 0
		let current = target

		while (current !== parent) {
			while (current.previous) {
				current = current.previous
				offset += current.length
			}

			current = current.parent
		}

		return offset
	}

	moveTail(container, target, offset) {
		const { tail } = this.splitByOffset(container, offset)
		const anchorOffset = target.length

		this.append(target, tail)
		this.core.selection.setSelection(target, anchorOffset)
	}

	combine(container, target) {
		if (container.isEmpty && container.parent.isSection && target.parent.isSection) {
			this.cut(container)
			this.core.selection.setSelection(target)
		} else {
			this.moveTail(target, container, 0)

			if (isFunction(target.onCombine)) {
				target.onCombine(this, container)
			}
		}
	}

	wrap(node, target, last) {
		this.append(node.parent, target, last.next)
		this.cutUntil(node, last)
		this.append(target, node)
	}

	cutEmpty(target) {
		if (!target.first) {
			this.cut(target)
		}
	}

	convert(node, target) {
		this.append(target, node.first)
		this.replace(node, target)
	}

	registerPlugins() {
		this.core.plugins.forEach((plugin) => {
			let nodes

			if (nodes = plugin.register) {
				Object.keys(nodes).forEach((type) => {
					this.registeredNodes[type] = nodes[type]
				})
			}
		})
	}
}
