import { operationTypes } from '../core/timetravel.js'
import isHtmlElement from '../utils/is-html-element.js'
import isFunction from '../utils/is-function.js'
import Fragment from '../nodes/fragment.js'
import nbsp from '../utils/nbsp.js'

const ignoreParsingElements = ['style', 'script']

export default class Builder {
	constructor(core) {
		this.core = core

		this.registeredNodes = {}
		this.registerPlugins()
		this.parse = this.parse.bind(this)
		this.appendHandler = this.appendHandler.bind(this)
		this.handleMount = this.handleMount.bind(this)
		this.handleUnmount = this.handleUnmount.bind(this)
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
		this.core.onNodeChange({
			type: operationTypes.ATTRIBUTE,
			target,
			previous,
			next
		})
		this.core.host.update(target)
	}

	parse(element, ctx = {}) {
		const fragment = this.createTree(element, ctx)

		this.normalize(fragment)

		return fragment
	}

	normalize(node) {
		let current = node.first
		let next
		let previous
		let normalized

		while (current) {
			next = current.next
			previous = current.previous

			if (previous && isFunction(previous.normalize) && (normalized = previous.normalize(current, this))) {
				if (previous.first) {
					this.append(normalized, previous.first)
				}

				if (current.first) {
					this.append(normalized, current.first)
				}

				this.replaceUntil(previous, normalized, current)
				this.normalize(normalized)
			} else {
				this.normalize(current)
			}

			current = next
		}
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

	createTree(element, ctx) {
		const fragment = this.createFragment()
		const lastElement = element.lastChild
		let currentElement = element.firstChild
		let nextElement
		let children = null
		let current

		while (currentElement) {
			const context = { ...ctx }

			if (ignoreParsingElements.includes(currentElement.nodeName.toLowerCase())) {
				currentElement = currentElement.nextSibling

				continue
			}

			nextElement = currentElement.nextSibling
			children = null
			current = this.core.plugins.reduce((parsed, plugin) => {
				if (parsed) return parsed

				return plugin.parse(currentElement, this, context)
			}, null)

			if (
				isHtmlElement(currentElement) &&
				currentElement.childNodes.length &&
				(!current || !current.isWidget && current.type !== 'text')
			) {
				children = this.createTree(currentElement, { ...context })
			}

			if (current) {
				this.append(fragment, current)

				if (children && children.first) {
					this.append(current, children.first)
				}

				if (current.isDeleteEmpty && !current.first) {
					this.cut(current)
				}
			} else if (children && children.first) {
				this.append(fragment, children.first)
			}

			if (currentElement === lastElement) {
				break
			}

			currentElement = nextElement
		}

		return fragment
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

				if (children && children.first) {
					this.append(current, children.first)
				}

				if (current.isDeleteEmpty && !current.first) {
					this.cut(current)
				}
			} else if (children && children.first) {
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

		if (typeof firstLevelNode.split === 'function') {
			return firstLevelNode.split(length, this)
		}

		return this.splitNode(firstLevelNode, length)
	}

	splitNode(target, offset) {
		let { node: nodeChild } = this.core.host.getChildByOffset(target, offset)

		while (nodeChild.parent !== target) {
			nodeChild = nodeChild.parent
		}

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
			head: null,
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

		if (target.type === 'fragment') {
			if (target.first) {
				this.append(node, target.first, anchor)
			}
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
		let parent

		this.cutUntil(target, last)
		this.prepareContainer(target)

		do {
			current.parent = node
			parent = node

			this.render(current)
			this.render(node)

			if (anchor) {
				this.render(anchor)
			}

			while (parent) {
				parent.length += current.length
				parent = parent.parent
			}

			this.core.host.append(node, current, anchor)

			if (node.isMount && isFunction(node.inputHandler)) {
				node.inputHandler()
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

		current = target

		while (current) {
			this.handleMount(current)
			current = current.next
		}

		if (node.isMount) {
			this.core.onNodeChange({
				type: operationTypes.APPEND,
				container: node,
				target,
				last,
				anchor
			})
		}
	}

	cut(node) {
		if (isFunction(node.cut)) {
			node.cut({ builder: this })
		} else {
			this.cutUntil(node, node)
		}
	}

	cutUntil(node, until) {
		const last = node.getNodeUntil(until)
		let current = node
		let parent

		if (node.isMount && (node.parent || node.previous || last.next)) {
			this.core.onNodeChange({
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
			this.handleText(current)

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
			parent = node.parent

			while (parent) {
				parent.length -= current.length
				parent = parent.parent
			}

			this.core.host.remove(current)
			this.handleUnmount(current)
			delete current.parent

			if (current === last) {
				break
			}

			current = current.next
		}
	}

	handleMount(node) {
		let current = node
		let hasRoot = false

		do {
			if (current.type === 'root') {
				hasRoot = true
				break
			}

			current = current.parent
		} while (current)

		if (hasRoot && !node.isMount) {
			node.isMount = true

			if (isFunction(node.onMount)) {
				node.onMount(this.core)
			}

			current = node.first

			while (current) {
				this.handleMount(current)
				current = current.next
			}
		}
	}

	handleUnmount(node) {
		let current

		if (node.isMount) {
			if (isFunction(node.onUnmount)) {
				node.onUnmount(this.core)
			}

			node.isMount = false
			current = node.first

			while (current) {
				this.handleUnmount(current)
				current = current.next
			}
		}
	}

	// возможно он больше не нужен, потому что я не восстанавливаю текстовые ноды, а создаю новые
	handleText(current) {
		const firstChild = current.deepesetFirstNode()
		const lastChild = current.previous.deepesetLastNode()

		if (firstChild && firstChild.type === 'text' && firstChild.attributes.content[0] === ' ') {
			firstChild.attributes.content = nbsp + firstChild.attributes.content.substr(1)
			firstChild.setNodeValue(firstChild.attributes.content)
		}

		if (lastChild && lastChild.type === 'text' && lastChild.attributes.content[lastChild.attributes.content.length - 1] === ' ') {
			lastChild.attributes.content = lastChild.attributes.content.substr(0, lastChild.attributes.content.length - 1) + nbsp
			lastChild.setNodeValue(lastChild.attributes.content)
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

	insert(node, target, offset) {
		const { tail } = this.split(node, offset)

		this.append(node, target, tail)
	}

	moveTail(container, target, offset) {
		const { tail } = this.split(container, offset)

		if (tail) {
			this.append(target, tail)
		}
	}

	render(node) {
		if (!node.element) {
			node.setElement(this.core.host.createElement(node.render()))
		}
	}

	prepareContainer(node) {
		if (node.isWidget) {
			node.element.setAttribute('tabindex', '0')
			node.element.setAttribute('data-widget', '')
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
