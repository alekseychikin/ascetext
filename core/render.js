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

		this.createElement = this.createElement.bind(this)
		this.onChange = this.onChange.bind(this)
		this.render = this.render.bind(this)

		this.selectionHandlers = []
		this.selectionTimeout = null
		this.timer = null
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
		this.anchorNode = null
		this.anchorOffset = null
		this.focusNode = null
		this.focusOffset = null

		document.body.appendChild(this.containerAvatar)
		this.core.builder.subscribe(this.onChange)
	}

	onChange(change) {
		let parent

		switch (change.type) {
			case operationTypes.APPEND:
			case operationTypes.CUT:
				parent = findParent(change.container, (parent) => parent.isContainer)

				break
			case operationTypes.ATTRIBUTE:
				parent = findParent(change.target, (parent) => parent.isContainer)

				break
		}

		if (parent) {
			parent.isRendered = false
			this.queue.push({
				type: 'update',
				container: parent
			})
		} else {
			switch (change.type) {
				case operationTypes.APPEND:
				case operationTypes.CUT:
					this.queue.push({
						type: change.type,
						container: change.container,
						target: change.target,
						last: change.last,
						anchor: change.anchor
					})

					break
				case operationTypes.ATTRIBUTE:
					this.queue.push({
						type: change.type,
						target: change.target
					})

					break
			}
		}

		this.dropRender()
		this.timer = requestAnimationFrame(this.render)
	}

	dropRender() {
		cancelAnimationFrame(this.timer)
	}

	render() {
		const queue = this.queue.splice(0).reduce((result, current, index, array) => {
			if (index) {
				const previous = array[index - 1]

				if (current.type === 'update' && previous.type === current.type && current.container === previous.container) {
					return result
				}
			}

			result.push(current)

			return result
		}, [])
		let event

		while (event = queue.shift()) {
			switch (event.type) {
				case operationTypes.APPEND:
					this.onAppend(event)

					break
				case operationTypes.CUT:
					this.onCut(event)

					break
				case operationTypes.ATTRIBUTE:
					this.onAttribute(event)

					break
				default:
					this.onUpdate(event.container)
			}
		}
	}

	onUpdate(node) {
		// make sure that used already existed nodes
		const tree = this.createTree(node.first, node.last)
		const container = this.mapNodeIdToElement[node.id]
		const lookahead = Array.prototype.slice.call(container.childNodes)
		const elements = tree.map((element) => this.createElement(element, lookahead))

		elements.forEach((element) => container.appendChild(element))
		lookahead.forEach((element) => {
			container.removeChild(element)
		})

		if (!container.childNodes.length || isElementBr(container.lastChild)) {
			container.appendChild(this.getTrailingBr())
		}

		node.isRendered = true

		this.sendMessage(node)
	}

	onAppend(event) {
		if (event.target.isRendered) {
			return
		}

		const container = this.mapNodeIdToElement[event.container.id]
		const tree = this.createTree(event.target, event.last)
		const elements = tree.map((element) => this.createElement(element))

		elements.forEach((element) => container.insertBefore(element, event.anchor ? this.mapNodeIdToElement[event.anchor.id] : null))
		this.handleMount(event.target, event.last)
	}

	onCut(event) {
		const container = this.mapNodeIdToElement[event.container.id]
		let element = event.target

		while (element) {
			if (container === this.mapNodeIdToElement[element.id].parentNode) {
				container.removeChild(this.mapNodeIdToElement[element.id])
			}

			if (element === event.last) {
				break
			}

			element = element.next
		}

		this.handleUnmount(event.target, event.last)
	}

	onAttribute({ target }) {
		const tree = this.createTree(target, target)[0]
		let container = target.element

		if (tree.type !== container.nodeName.toLowerCase()) {
			this.handleUnmount(target, target)
			target.element = this.mapNodeIdToElement[target.id] = container = this.replaceNode(tree, container)
			this.handleMount(target, target)
		}

		this.applyAttributes(container, tree)

		if (tree.type === container.nodeName.toLowerCase()) {
			this.sendMessage(target)
		}
	}

	createTree(target, last = null) {
		const body = []
		let current = target
		let element
		let parent

		while (current) {
			element = current.render(this.createTree(current.first))
			parent = findParent(current.parent, (parent) => parent.isContainer)

			if (!parent || current.isContainer) {
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

		if ((containerElements.includes(tree.type) || typeof tree.attributes.tabIndex !== 'undefined') && !element.childNodes.length) {
			element.appendChild(this.getTrailingBr())
		}

		lookaheadChildren.forEach((child) => element.removeChild(child))

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
			element.setAttribute(attributeName, tree.attributes[attributeName])
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

	handleMount(node, last) {
		let current = node

		while (current) {
			current.isRendered = true
			current.element = this.mapNodeIdToElement[current.id]

			if (isFunction(current.onMount)) {
				if (current.isContainer || current.isWidget) {
					current.onMount(this.core)
				} else {
					console.error('onMount method only for containers and widgets')
				}
			}

			this.sendMessage(current)
			this.handleMount(current.first)

			if (current === last) {
				break
			}

			current = current.next
		}
	}

	handleUnmount(node, last) {
		let current = node

		while (current) {
			current.isRendered = false

			if (isFunction(current.onUnmount)) {
				if (current.isContainer || current.isWidget) {
					current.onUnmount(this.core)
				} else {
					console.error('onUnmount method only for containers and widgets')
				}
			}

			this.sendMessage(current)
			this.handleUnmount(current.first)

			if (current === last) {
				break
			}

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
