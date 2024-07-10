import Publisher from './publisher.js'
import isFunction from '../utils/is-function.js'
import Fragment from '../nodes/fragment.js'
import findParent, { hasRoot } from '../utils/find-parent.js'

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
		this.appendHandler = this.appendHandler.bind(this)
		this.normalizeHandle = this.normalizeHandle.bind(this)
		this.unnormalizedNodes = []
		this.timer = null
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
		this.normalize(target)
		this.normalize(target.next)
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

	parseVirtualTree(tree, ctx = {}) {
		const fragment = this.createFragment()
		let currentElement
		let i
		let children = null
		let current

		for (i = 0; i < tree.length; i++) {
			const context = { ...ctx }

			currentElement = tree[i]

			children = null
			current = this.core.plugins.reduce((parsed, plugin) => {
				if (parsed) return parsed

				return plugin.parseTreeElement(currentElement, this, context)
			}, null)

			if (!current || !current.isWidget && current.type !== 'text') {
				children = this.parseVirtualTree(currentElement.body, { ...context })
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

		// this.append(firstLevelNode.parent, duplicate, firstLevelNode.next)
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

			// this.append(container.parent, duplicate, container.next)
			// this.append(duplicate.tail, currentTail)

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

	duplicate(target) {
		return isFunction(target.duplicate)
			? target.duplicate(this)
			: this.create(target.type, { ...target.attributes })
	}

	push(node, target) {
		this.cut(target)
		this.append(node, target)
	}

	append(node, target, anchor) {
		if (!target) {
			return
		}

		if (target.type === 'fragment') {
			this.append(node, target.first, anchor)
		} else {
			this.appendHandler(node, target, anchor)
		}
	}

	appendHandler(node, target, anchor) {
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

		if (hasRoot(target)) {
			this.sendMessage({
				type: operationTypes.APPEND,
				container: node,
				target,
				last,
				anchor
			})
			this.normalize(last)
			this.normalize(last.next)
		}
	}

	cut(node) {
		if (!node) {
			return
		}

		if (isFunction(node.cut)) {
			node.cut({ builder: this })
		} else {
			this.cutUntil(node, node)
		}
	}

	cutUntil(node, until) {
		if (!node) {
			return
		}

		const last = node.getNodeUntil(until)
		let current = node

		if (hasRoot(node)) {
			this.sendMessage({
				type: operationTypes.CUT,
				container: node.parent,
				last,
				anchor: last.next,
				previous: node.previous,
				next: last.next,
				target: node
			})

			this.normalize(last.next)
			this.normalize(node.previous)
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

	normalize(node) {
		if (!node) {
			return
		}

		if (!this.unnormalizedNodes.includes(node)) {
			this.unnormalizedNodes.push(node)
		}

		clearTimeout(this.timer)
		this.timer = setTimeout(this.normalizeHandle, 0)
	}

	normalizeHandle() {
		let current
		let limit = 1000

		// console.log('before normalize document')

		// console.warn('normalize', this.unnormalizedNodes)

		while ((current = this.unnormalizedNodes.pop()) && limit-- > 0) {
			if (hasRoot(current)) {
				// console.log('normalize', current)
				// console.log(window.printTree(this.core.model))
				if (!this.normalizeWalkUp(current)) {
					// console.log('walk down', current)
					this.normalizeWalkDown(current)
				}
			}
		}
	}

	normalizeWalkUp(node) {
		let current = node

		while (current && current !== this.core.model) {
			current = current.deepesetLastNode()

			while (current.previous) {
				if (this.normalizeEmpty(node, current)) {
					return true
				}

				if (this.normalizeJoin(node, current)) {
					return true
				}

				current = current.previous
			}

			if (this.normalizeEmpty(node, current)) {
				return true
			}

			while (!current.previous) {
				current = current.parent

				if (current === this.core.model) {
					break
				}

				// console.log(node, current)

				if (this.normalizeJoin(node, current)) {
					return true
				}

				if (this.normalizeEmpty(node, current)) {
					return true
				}
			}

			current = current.previous
		}

		return false
	}

	normalizeWalkDown(node) {
		let current = node

		while (current && current !== this.core.model) {
			current = current.deepesetFirstNode()

			while (current.next) {
				// console.log('current', current)

				if (current.first) {
					// console.log(current)
					current = current.deepesetFirstNode()
					break
				}

				if (this.normalizeAccept(node, current)) {
					return true
				}

				// if (this.normalizeJoin(node, current)) {
				// 	return true
				// }

				current = current.next
			}

			// console.log('current', current)

			if (this.normalizeAccept(node, current)) {
				return true
			}

			while (!current.next) {
				current = current.parent

				if (current === this.core.model) {
					break
				}

				if (this.normalizeAccept(node, current)) {
					return true
				}
			}

			current = current.next
		}

		return false
	}

	// нужно пойти в самую последнюю ноду и попробовать соединить с предыдущей
	// если они соединяются, соединить и начать нормализацию заново

	// проверить, может ли нода здесь быть
	// если не может, продублировать родителя и переместить в него node.next (если есть)
	// вставить ноду в родителя между двумя продублированными элементами и начать нормализацию заново

	normalizeEmpty(node, current) {
		if (current.canDelete()) {
			if (node !== current) {
				this.normalize(node)
			} else {
				this.normalize(current.previous)
			}

			this.core.render.dropRender()
			this.cut(current)

			return true
		}

		if (current.isContainer && current.isEmpty && !current.first) {
			this.core.render.dropRender()
			this.append(current, this.create('text', { content: '' }))
		}

		return false
	}

	normalizeAccept(node, current) {
		// console.log('normalizeAccept', current.parent, current)
		if (!current.parent.accept(current) || !current.fit(current.parent)) {
			// найти родителя, который может в себе содержать current
			// сделать сплит, разместить current, запустить нормализацию заново

			// надо проверить, что вообще возможно поместить этот current хоть во что-то из родителей
			// если нет, то нужно попробовать поместить дочерние элементы
			let next = current.parent.next
			let parent = current.parent

			if (current.next) {
				const duplicated = current.parent.split(this, current.next)

				// this.append(current.parent.parent, duplicated, current.parent.next)
				next = duplicated.tail
				parent = duplicated.head
			}

			this.core.render.dropRender()
			this.append(parent.parent, current, next)
			this.normalize(node)

			return true
		}

		return false
	}

	normalizeJoin(node, current) {
		// console.log('current', current)
		let joined

		// if (node === current) {
		// 	console.log('equal', node)
		// 	return false
		// }

		if (joined = this.join(current)) {
			// console.log('joined', joined)
			// console.log(node.previous, joined, node)
			if (current === node) {
				this.normalize(joined)
			} else {
				this.normalize(node)
			}

			return true
		}

		return false
	}

	join(node) {
		const previous = node.previous
		let joined

		// console.log('previous', previous)

		if (previous && isFunction(previous.join) && (joined = previous.join(node, this))) {
			this.core.render.dropRender()
			this.append(joined, previous.first)
			this.append(joined, node.first)
			this.replaceUntil(previous, joined, node)

			return joined
		}

		return null
	}

	canAccept(container, current) {
		if (container.accept(current) && current.fit(container)) {
			return container
		}

		if (container.parent) {
			return this.canAccept(container.parent, current)
		}

		return false
	}

	insertText(target, anchor) {
		const current = target.isFragment ? target.first : target
		let next = current
		let last

		if (current.type === 'text' || current.isInlineWidget) {
			last = current

			while (last) {
				if (last.type !== 'text' && !last.isInlineWidget || !last.next) {
					break
				}

				last = last.next
			}

			next = last.next
			this.cutUntil(current, last)
			this.append(anchor.parent, current, anchor)
		} else if (current.isContainer) {
			next = current.next
			this.cut(current)
			this.append(anchor.parent, current.first, anchor)
		}

		return next
	}

	insert(target) {
		const { selection: { anchorContainer, anchorOffset, setSelection } } = this.core
		const splitted = this.splitByOffset(anchorContainer, anchorOffset)
		const rest = this.insertText(target, splitted.tail)

		if (rest) {
			const { head, tail } = this.splitByTail(anchorContainer.parent, splitted.tail)

			this.append(head.parent, rest, tail)
			setSelection(tail)
		} else {
			setSelection(anchorContainer, this.core.editing.getOffsetToParent(anchorContainer, splitted.tail))
		}
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
