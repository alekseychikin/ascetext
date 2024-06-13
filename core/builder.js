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
		this.appendHandler = this.appendHandler.bind(this)
		this.unnormalizedNodes = []
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

	split(container, offset) {
		let length = offset
		let firstLevelNode = container.first

		while (firstLevelNode && length > firstLevelNode.length) {
			length -= firstLevelNode.length
			firstLevelNode = firstLevelNode.next
		}

		if (!firstLevelNode) {
			return {
				head: undefined,
				tail: undefined
			}
		}

		if (isFunction(firstLevelNode.split)) {
			return firstLevelNode.split(length, this)
		}

		return this.splitNode(firstLevelNode, length)
	}

	splitNode(target, offset) {
		const { head, tail } = this.split(target, offset)

		// if (head && tail) {
			const duplicate = this.duplicate(target)

			this.append(target.parent, duplicate, target.next)
			this.append(duplicate, tail)

			return {
				head: target,
				tail: duplicate
			}
		// }

		// if (head) {
		// 	return {
		// 		head: target,
		// 		tail: target.next
		// 	}
		// }

		// return {
		// 	head: undefined,
		// 	tail: target
		// }
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
		let container = node
		let current = target
		let next
		let tail = anchor

		if (!target) {
			return
		}

		if (target.type === 'fragment') {
			this.append(node, target.first, anchor)
		} else {
			// while (current) {
			// 	next = current.next

				// if (this.canAccept(container, current)) {
					// while (!container.accept(current)) {
					// 	// if (tail && (!container.isContainer || !container.isEmpty)) {
					// 	// 	duplicate = container.duplicate(this)
					// 	// 	this.append(duplicate, tail)
					// 	// }

					// 	tail = container.next
					// 	container = container.parent
					// }

					// this.cut(current)

			// 		if (isFunction(container.append)) {
			// 			container.append(current, tail, { builder: this, appendDefault: this.appendHandler })
			// 		} else {
					this.appendHandler(container, current, tail)
			// 		}
				// } else {
			// 		if (isFunction(current.wrapper)) {
			// 			const wrapper = current.wrapper(this)

			// 			if (this.canAccept(container, wrapper)) {
			// 				this.append(container, wrapper, tail)
			// 				this.cut(current)
			// 				this.append(wrapper, current)

			// 				container = wrapper
			// 				current = next
			// 				tail = null

			// 				continue
			// 			}
			// 		}

				// 	this.cut(current)
				// 	console.log('can not accept', container, current)
				// }

			// 	current = next
			// }
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

		if (findParent(target, (item) => item.type === 'root')) {
			this.sendMessage({
				type: operationTypes.APPEND,
				container: node,
				target,
				last,
				anchor
			})
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

		if (findParent(node, (item) => item.type === 'root')) {
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

	normalize(node) {
		let current
		let limit = 1000

		this.unnormalizedNodes.push(node)

		while ((current = this.unnormalizedNodes.pop()) && limit-- > 0) {
			if (!this.normalizeWalkUp(current)) {
				// console.log('walk down', current)
				this.normalizeWalkDown(current)
			}
		}

			// console.log('check', current)
			// current = current.parent

			// console.log('check', current)
			// current = current.previous
			// if (joined = this.join(current)) {
			// 	console.log('joined', joined)
			// 	console.log(current.previous, joined, current)
			// 	return this.normalize(joined)
			// }

			// if (current.previous) {
			// 	current = current.previous
			// } else {
			// 	current = current.parent
			// }
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

				if (this.normalizeJoin(node, current)) {
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
		if (current.isDeleteEmpty && !current.first) {
			// console.log('delete empty', current)
			this.cut(current)

			if (node !== current) {
				this.unnormalizedNodes.push(node)
			}

			return true
		}

		return false
	}

	normalizeAccept(node, current) {
		// console.log('normalizeAccept', current.parent, current)
		if (!current.parent.accept(current) || !current.fit(current.parent)) {
			// надо проверить, что вообще возможно поместить этот current хоть во что-то из родителей
			// если нет, то нужно попробовать поместить дочерние элементы
			let next = current.parent.next

			if (current.next) {
				const duplicated = this.duplicate(current.parent)

				this.append(current.parent.parent, duplicated, current.parent.next)
				this.append(duplicated, current.next)
				next = duplicated
			}

			this.append(current.parent.parent, current, next)
			this.unnormalizedNodes.push(node)

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
				this.unnormalizedNodes.push(joined)
			} else {
				this.unnormalizedNodes.push(node)
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

	insert(target) {
		const { selection: { anchorContainer, anchorOffset, setSelection } } = this.core
		const { tail } = this.split(anchorContainer, anchorOffset)

		this.append(anchorContainer, target, tail)
		setSelection(anchorContainer, anchorOffset + 1)
	}

	moveTail(container, target, offset) {
		const { tail } = this.split(container, offset)
		const anchotOffset = target.length

		this.append(target, tail)
		this.core.selection.setSelection(target, anchotOffset)
	}

	combine(container, target) {
		if (container.isEmpty && container.parent.isSection && target.parent.isSection) {
			this.cut(container)
			this.core.selection.setSelection(target)
		} else {
			this.moveTail(target, container, 0)

			if (isFunction(target.onCombine)) {
				target.onCombine(this)
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
