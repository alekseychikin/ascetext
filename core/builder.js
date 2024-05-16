import isHtmlElement from '../utils/is-html-element.js'
import isFunction from '../utils/is-function.js'
import Fragment from '../nodes/fragment.js'
import findParent from '../utils/find-parent.js'

export const operationTypes = {
	CUT: 'cut',
	APPEND: 'append',
	ATTRIBUTE: 'attribute'
}

const ignoreParsingElements = ['style', 'script']

export default class Builder {
	constructor(core) {
		this.core = core

		this.registeredNodes = {}
		this.registerPlugins()
		// this.parse = this.parse.bind(this)
		this.appendHandler = this.appendHandler.bind(this)
		this.onChangeHandlers = []
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
		this.dispatch({
			type: operationTypes.ATTRIBUTE,
			target,
			previous,
			next
		})
	}

	// parse(element, ctx = {}) {
	// 	const fragment = this.createTree(element, ctx)

	// 	this.normalize(fragment)

	// 	return fragment
	// }

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

	// createTree(element, ctx) {
	// 	const fragment = this.createFragment()
	// 	const lastElement = element.lastChild
	// 	let currentElement = element.firstChild
	// 	let nextElement
	// 	let children = null
	// 	let current

	// 	while (currentElement) {
	// 		const context = { ...ctx }

	// 		if (ignoreParsingElements.includes(currentElement.nodeName.toLowerCase())) {
	// 			currentElement = currentElement.nextSibling

	// 			continue
	// 		}

	// 		nextElement = currentElement.nextSibling
	// 		children = null
	// 		current = this.core.plugins.reduce((parsed, plugin) => {
	// 			if (parsed) return parsed

	// 			return plugin.parse(currentElement, this, context)
	// 		}, null)

	// 		if (
	// 			isHtmlElement(currentElement) &&
	// 			currentElement.childNodes.length &&
	// 			(!current || !current.isWidget && current.type !== 'text')
	// 		) {
	// 			children = this.createTree(currentElement, { ...context })
	// 		}

	// 		if (current) {
	// 			this.append(fragment, current)

	// 			if (children && children.first) {
	// 				this.append(current, children.first)
	// 			}

	// 			if (current.isDeleteEmpty && !current.first) {
	// 				this.cut(current)
	// 			}
	// 		} else if (children && children.first) {
	// 			this.append(fragment, children.first)
	// 		}

	// 		if (currentElement === lastElement) {
	// 			break
	// 		}

	// 		currentElement = nextElement
	// 	}

	// 	return fragment
	// }

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

				if (current.isDeleteEmpty && !current.first) {
					this.cut(current)
				}
			} else if (children) {
				this.append(fragment, children.first)
			}
		}

		return fragment
	}

	// normalize(node) {
	// 	let current = node.first
	// 	let next
	// 	let previous
	// 	let normalized

	// 	while (current) {
	// 		next = current.next
	// 		previous = current.previous

	// 		if (previous && isFunction(previous.normalize) && (normalized = previous.normalize(current, this))) {
	// 			if (previous.first) {
	// 				this.append(normalized, previous.first)
	// 			}

	// 			if (current.first) {
	// 				this.append(normalized, current.first)
	// 			}

	// 			this.replaceUntil(previous, normalized, current)
	// 			this.normalize(normalized)
	// 		} else {
	// 			this.normalize(current)
	// 		}

	// 		current = next
	// 	}
	// }

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

		if (head && tail) {
			const duplicate = this.duplicate(target)

			this.append(target.parent, duplicate, target.next)
			this.append(duplicate, tail)

			return {
				head: target,
				tail: duplicate
			}
		}

		if (head) {
			return {
				head: target,
				tail: target.next
			}
		}

		return {
			head: undefined,
			tail: target
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
			if (node.isContainer && node.isEmpty) {
				if (tail && tail === node.first) {
					tail = node.first.next
				}

				if (node.first) {
					this.cut(node.first)
				}
			}

			while (current) {
				next = current.next

				if (this.canAccept(container, current)) {
					while (!container.accept(current)) {
						// if (tail && (!container.isContainer || !container.isEmpty)) {
						// 	duplicate = container.duplicate(this)
						// 	this.append(duplicate, tail)
						// }

						tail = container.next
						container = container.parent
					}

					this.cut(current)

					if (isFunction(container.append)) {
						container.append(current, tail, { builder: this, appendDefault: this.appendHandler })
					} else {
						this.appendHandler(container, current, tail)
					}
				} else {
					if (isFunction(current.wrapper)) {
						const wrapper = current.wrapper(this)

						if (this.canAccept(container, wrapper)) {
							this.append(container, wrapper, tail)
							this.cut(current)
							this.append(wrapper, current)

							container = wrapper
							current = next
							tail = null

							continue
						}
					}

					this.cut(current)
					console.log('can not accept', container, current)
				}

				current = next
			}
		}
	}

	appendHandler(node, target, anchor) {
		const last = target.getNodeUntil()
		let current = target

		this.cutUntil(target, last)
		// this.prepareContainer(target)

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
			this.dispatch({
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
			this.dispatch({
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

	canAccept(container, current) {
		if (container.accept(current)) {
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

		console.log('insert')
		this.append(anchorContainer, target, tail)
		// посчитать длину вставляемого таргета и поставить каретку в последнее положение
		setSelection(anchorContainer, anchorOffset + 1)
	}

	moveTail(container, target, offset) {
		const { tail } = this.split(container, offset)

		this.append(target, tail, target.first)
		this.core.selection.setSelection(target)
	}

	// prepareContainer(node) {
	// 	if (node.isWidget) {
	// 		node.element.setAttribute('tabindex', '0')
	// 		node.element.setAttribute('data-widget', '')
	// 	}
	// }

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

	dispatch(change) {
		this.onChangeHandlers.forEach((handler) => handler(change))
	}

	onChange(handler) {
		this.onChangeHandlers.push(handler)
	}
}
