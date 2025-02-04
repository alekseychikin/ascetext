import Publisher from './publisher.js'
import isTextElement from '../utils/is-text-element.js'
import isElementBr from '../utils/is-element-br.js'
import createElement from '../utils/create-element.js'
import findParent from '../utils/find-parent.js'
import isFunction from '../utils/is-function.js'
import getAttributes from '../utils/get-attributes.js'
import { operationTypes } from '../core/builder.js'

const containerElements = [
	'address',
	'blockquote',
	'dd',
	'dt',
	'figcaption',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'header',
	'p',
	'pre'
]
const mapModifierToTag = {
	bold: 'strong',
	italic: 'em',
	strike: 's',
	underlined: 'u'
}

export default class Render extends Publisher {
	constructor(core) {
		super()

		this.core = core
		this.core.model.element = this.core.node
		this.core.model.isRendered = true

		this.createElement = this.createElement.bind(this)
		this.onChange = this.onChange.bind(this)
		this.render = this.render.bind(this)

		this.queue = []
		this.mapNodeIdToElement = {
			[this.core.model.id]: this.core.node
		}
		this.mapNodeIdToNode = {
			[this.core.model.id]: this.core.model
		}
		this.containerAvatar = createElement('div', {
			style: {
				position: 'fixed',
				bottom: '0',
				left: '0',
				maxWidth: '100%',
				opacity: '0',
				pointerEvents: 'none'
			}
		})

		document.body.appendChild(this.containerAvatar)
		this.core.builder.subscribe(this.onChange)
	}

	onChange(change) {
		if (!this.core.model.contains(change.target)) {
			return
		}

		const last = change.last || change.target
		let parent
		let current = change.target

		while (current) {
			switch (change.type) {
				case operationTypes.APPEND:
				case operationTypes.CUT:
					parent = findParent(change.container, (parent) => parent.isContainer)
					this.markUnrendered(current)

					break
				case operationTypes.ATTRIBUTE:
					parent = findParent(current, (parent) => parent.isContainer)

					break
			}

			if (current.type === 'text' || current.isInlineWidget) {
				this.markUnrendered(parent)
				this.queue.push({
					type: 'update',
					target: parent,
				})
			} else {
				switch (change.type) {
					case operationTypes.APPEND:
					case operationTypes.CUT:
						this.queue.push({
							type: change.type,
							container: change.container,
							target: current
						})

						break
					case operationTypes.ATTRIBUTE:
						this.queue.push({
							type: 'update',
							target: change.target
						})

						break
				}
			}

			if (current === last) {
				break
			}

			current = current.next
		}
	}

	markUnrendered(target, last = target) {
		let current = target

		while (current) {
			current.isRendered = false

			this.markUnrendered(current.first, current.last)

			if (last && current === last) {
				break
			}

			current = current.next
		}
	}

	render() {
		const queue = this.queue.splice(0).reduce((result, current) => {
			if (
				current.type === operationTypes.APPEND && (!current.container.contains(current.target) || !current.container.isMount) ||
				current.type === 'update' && !current.target.isMount
			) {
				return result
			}

			result.push(current)

			return result
		}, [])
		let event
		const added = []
		const updated = []

		while (event = queue.shift()) {
			switch (event.type) {
				case operationTypes.CUT:
					this.cut(event)

					break
				case operationTypes.APPEND:
					added.push(event)

					break
				default:
					updated.push(event)
			}
		}

		while (event = added.shift()) {
			this.append(event)
		}

		while (event = updated.shift()) {
			this.update(event.target)
		}
	}

	cut(event) {
		const element = this.mapNodeIdToElement[event.target.id]

		if (event.target.isMount) {
			if (element.parentNode) {
				element.parentNode.removeChild(element)
			}

			this.handleUnmount(event.target, event.target)
		}
	}

	append(event) {
		const container = this.mapNodeIdToElement[event.container.id]
		const tree = this.createTree(event.target, event.target)
		const elements = tree.map((element) => this.createElement(element))

		elements.forEach((element) => container.insertBefore(element, this.findAnchor(event.target)))
		this.handleMount(event.target, event.target)
		this.handleInput(event.target)
	}

	update(node) {
		const tree = this.createTree(node, node)[0]
		let container = node.element

		if (tree.type !== container.nodeName.toLowerCase()) {
			this.handleUnmount(node, node)
			node.element = this.mapNodeIdToElement[node.id] = container = this.replaceNode(tree, container)
			this.handleMount(node, node)
		}

		this.applyAttributes(container, tree)

		const lookahead = Array.prototype.slice.call(container.childNodes)

		if (tree.body) {
			const elements = tree.body.map((element) => this.createElement(element, lookahead))

			elements.forEach((element) => container.appendChild(element))
		}

		lookahead.forEach((element) => {
			container.removeChild(element)
		})

		if (containerElements.includes(tree.type) || typeof tree.attributes.tabIndex !== 'undefined') {
			this.handleContainer(container)
		}

		node.isRendered = true
		this.handleMount(node.first)
		this.handleInput(node)
		this.sendMessage(node)
	}

	findAnchor(node) {
		let current = node.next

		while (current) {
			if (current.isMount) {
				return current.element
			}

			current = current.next
		}

		return null
	}

	createTree(target, last = null) {
		const body = []
		let current = target
		let element

		while (current) {
			element = current.render(this.createTree(current.first))

			if (current.type !== 'text' && !current.isInlineWidget) {
				element.id = current.id
				this.mapNodeIdToNode[current.id] = current
			}

			if ((current.isContainer || current.isWidget) && !containerElements.includes(element.type)) {
				element.attributes.tabIndex = '0'
			}

			if (current.isWidget) {
				element.isWidget = true
			}

			body.push(element)

			if (current === last) {
				break
			}

			current = current.next
		}

		return body
	}

	createElement(tree, lookahead = []) {
		if (tree.type === 'text') {
			return this.createText(tree, this.generateModifiers(tree), lookahead)
		}

		const lookaheadElement = this.findLookahead(lookahead, tree.type)
		const lookaheadChildren = lookaheadElement ? Array.prototype.slice.call(lookaheadElement.childNodes) : []
		const element = lookaheadElement || document.createElement(tree.type)

		this.applyAttributes(element, tree)

		if (tree.id) {
			if (this.mapNodeIdToElement[tree.id] && this.mapNodeIdToElement[tree.id].parentNode) {
				this.mapNodeIdToElement[tree.id].parentNode.removeChild(this.mapNodeIdToElement[tree.id])
			}

			this.mapNodeIdToElement[tree.id] = element
		}

		tree.body
			.map((child) => this.createElement(child, lookaheadChildren))
			.forEach((child) => element.appendChild(child))

		lookaheadChildren.forEach((child) => {
			element.removeChild(child)
		})

		if (containerElements.includes(tree.type) || typeof tree.attributes.tabIndex !== 'undefined') {
			this.handleContainer(element)
		}

		return element
	}

	createText(tree, modifiers, lookahead = []) {
		let modifier

		if (modifier = modifiers.shift()) {
			const type = mapModifierToTag[modifier]
			const element = document.createElement(type)

			element.appendChild(this.createText(tree, modifiers))

			return element
		}

		const lookaheadElement = this.findLookahead(lookahead, 'text')

		if (lookaheadElement) {
			if (lookaheadElement.nodeValue !== tree.attributes.content) {
				lookaheadElement.nodeValue = tree.attributes.content
			}

			return lookaheadElement
		}

		return document.createTextNode(tree.attributes.content)
	}

	applyAttributes(element, tree) {
		const currentsAttributes = getAttributes(element)
		let attributeName

		for (attributeName in currentsAttributes) {
			if (typeof tree.attributes[attributeName] === 'undefined' || tree.attributes[attributeName] === null) {
				element.removeAttribute(attributeName)
			}
		}

		for (attributeName in tree.attributes) {
			if (currentsAttributes[attributeName] !== tree.attributes[attributeName]) {
				element.setAttribute(attributeName, tree.attributes[attributeName])
			}
		}

		if (tree.id) {
			element.dataset.nodeId = tree.id
		}

		if (tree.isWidget) {
			element.dataset.widget = ''
		}
	}

	replaceNode(tree, container) {
		const parent = container.parentNode
		const next = container.nextSibling
		const node = this.createElement(tree)

		parent.insertBefore(node, next)

		return node
	}

	findLookahead(lookahead, type) {
		let i

		for (i = 0; i < lookahead.length; i++) {
			switch (type) {
				case 'text':
					if (isTextElement(lookahead[i])) {
						return lookahead.splice(i, 1)[0]
					}

					break
				default:
					if (lookahead[i].nodeName.toLowerCase() === type) {
						return lookahead.splice(i, 1)[0]
					}
			}
		}

		return null
	}

	generateModifiers(element) {
		const modifiers = []

		if (element.attributes.weight) {
			modifiers.push('bold')
		}

		if (element.attributes.style) {
			modifiers.push('italic')
		}

		if (element.attributes.decoration) {
			modifiers.push('underlined')
		}

		if (element.attributes.strike) {
			modifiers.push('strike')
		}

		return modifiers
	}

	handleContainer(element) {
		const isEmpty = !element.firstChild || isTextElement(element.firstChild) && !element.firstChild.length
		const hasLastBr = element.lastChild && isTextElement(element.lastChild) && !element.lastChild.length &&
			element.lastChild.previousSibling && isElementBr(element.lastChild.previousSibling)

		if (isEmpty || hasLastBr) {
			element.appendChild(this.getTrailingBr())
		}
	}

	handleMount(node, last) {
		let current = node

		while (current) {
			current.isRendered = true
			current.element = this.mapNodeIdToElement[current.id]

			if (current.parent.isMount && !current.isMount) {
				current.isMount = true

				if (isFunction(current.onMount)) {
					if (current.isContainer || current.isWidget) {
						current.onMount(this.core)
					} else {
						console.error('onMount method only for containers and widgets', current)
					}
				}

				this.handleMount(current.first)
			}

			this.sendMessage(current)

			if (current === last) {
				break
			}

			current = current.next
		}
	}

	handleUnmount(node, last) {
		let current = node

		while (current) {
			if (current.isMount && isFunction(current.onUnmount)) {
				if (current.isContainer || current.isWidget) {
					current.onUnmount(this.core)
				} else {
					console.error('onUnmount method only for containers and widgets', current)
				}
			}

			current.isMount = false
			this.sendMessage(current)
			this.handleUnmount(current.first)

			if (current === last) {
				break
			}

			current = current.next
		}
	}

	handleInput(node) {
		let current = node.first

		if (isFunction(node.inputHandler)) {
			node.inputHandler(node === this.core.selection.anchorContainer)
		}

		while (current) {
			this.handleInput(current)

			current = current.next
		}
	}

	getTrailingBr() {
		const trailingBr = document.createElement('br')

		trailingBr.setAttribute('data-trailing', '')

		return trailingBr
	}

	getNodeById(id) {
		return this.mapNodeIdToNode[id]
	}
}
