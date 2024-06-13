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

		this.selectionHandlers = []
		this.selectionTimeout = null
		this.timer = null
		this.queue = []
		this.updatedContainers = []
		this.removedNodes = []
		this.updatedNodes = []
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
		// console.log(change)
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

		// console.log('parent', parent, change.target)

		if (change.target.type === 'text' || change.target.isInlineWidget) {
			this.pushUpdateNode(parent)
		} else {
			switch (change.type) {
				case operationTypes.APPEND:
					// console.log(change)
					this.pushContainer(change.container)
					this.markUnrendered(change.target, change.last)
					// this.queue.push({
					// 	type: change.type,
					// 	container: change.container,
					// 	target: change.target,
					// 	last: change.last,
					// 	anchor: change.anchor
					// })

					break
				case operationTypes.CUT:
					// console.log(change)
					this.pushRemoveNodes(change)

					break
				case operationTypes.ATTRIBUTE:
					console.log(change)
					// this.queue.push({
					// 	type: change.type,
					// 	target: change.target
					// })

					break
			}
		}

		this.dropRender()
		this.timer = requestAnimationFrame(this.render)
	}

	pushContainer(container) {
		if (container.isRendered && !this.updatedContainers.includes(container)) {
			this.updatedContainers.push(container)
		}
	}

	pushRemoveNodes(event) {
		let current = event.target

		while (current) {
			if (!this.removedNodes.includes(current)) {
				this.removedNodes.push(current)
			}

			if (event.last && current === event.last) {
				break
			}

			current = current.next
		}
	}

	pushUpdateNode(node) {
		if (!this.updatedNodes.includes(node)) {
			this.updatedNodes.push(node)
		}
	}

	markUnrendered(target, last) {
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

	dropRender() {
		cancelAnimationFrame(this.timer)
	}

	render() {
		// const getTextLog = (node, until) => {
		// 	const output = []
		// 	let current = node

		// 	while (current) {
		// 		output.push(`${current.type} (${current.id})`)

		// 		if (!until || current === until) {
		// 			break
		// 		}

		// 		current = current.next
		// 	}

		// 	return output.join(' | ')
		// }

		// const queue = this.queue.splice(0).reduce((result, current) => {
		// 	let i

		// 	for (i = 0; i < result.length; i++) {
		// 		if (current.type === 'update' && result[i].type === current.type && current.container === result[i].container) {
		// 			console.log('skip update')
		// 			return result
		// 		}

		// 		// if (current.type === 'append' && result[i].type === current.type && result[i].target !== current.target) {
		// 		// 	if (result[i].target.contains(current.target)) {
		// 		// 		console.log('skip append', `${current.container.type} (${current.container.id}) → ${current.target.type} (${current.target.id})` + (current.target !== current.last ? ` × ${current.last.type} (${current.last.id})` : ''))
		// 		// 		console.log('»', `${result[i].container.type} (${result[i].container.id}) → ${result[i].target.type} (${result[i].target.id})` + (result[i].target !== result[i].last ? ` × ${result[i].last.type} (${result[i].last.id})` : ''))
		// 		// 		return result
		// 		// 	} else if (current.target.contains(result[i].target)) {
		// 		// 		console.log('handle this append')
		// 		// 		console.log(current)
		// 		// 		console.log(result[i])
		// 		// 	}
		// 		// }
		// 	}

		// 	result.push(current)

		// 	return result
		// }, [])
		// let event

		// queue.forEach((item) => {
		// 	switch (item.type) {
		// 		case 'update':
		// 			console.log('upd', getTextLog(item.container))
		// 			break
		// 		case 'append':
		// 			console.log('app', `${getTextLog(item.container)} → ${getTextLog(item.target, item.last)}`)
		// 			break
		// 		case 'cut':
		// 			console.log('cut', `${getTextLog(item.container)} → ${getTextLog(item.target, item.last)}`)
		// 			break
		// 	}
		// })

		// while (event = queue.shift()) {
		// 	switch (event.type) {
		// 		case operationTypes.APPEND:
		// 			this.onAppend(event)

		// 			break
		// 		case operationTypes.CUT:
		// 			this.onCut(event)

		// 			break
		// 		case operationTypes.ATTRIBUTE:
		// 			this.onAttribute(event)

		// 			break
		// 		default:
		// 			this.onUpdate(event.container)
		// 	}
		// }

		let container
		let node
		let index
		// console.log('removed nodes')
		// console.log(this.removedNodes)

		// console.log('updated containers')
		// console.log(this.updatedContainers)

		// console.log('updated nodes')
		// console.log(this.updatedNodes)

		while (node = this.removedNodes.shift()) {
			if (this.mapNodeIdToElement[node.id] && this.mapNodeIdToElement[node.id].parentNode) {
				this.mapNodeIdToElement[node.id].parentNode.removeChild(this.mapNodeIdToElement[node.id])
			}

			this.handleUnmount(node, node)
			index = this.updatedNodes.indexOf(node)

			if (index > -1) {
				this.updatedNodes.splice(index, 1)
			}
		}

		while(container = this.updatedContainers.shift()) {
			let current = container.first

			while (current) {
				if (!current.isRendered) {
					// console.log('append', container, current)
					this.append(container, current)
				}

				current = current.next
			}
		}

		while (node = this.updatedNodes.shift()) {
			this.update(node)
		}
	}

	append({ element: container }, node) {
		const tree = this.createTree(node, node)
		const elements = tree.map((element) => this.createElement(element))

		elements.forEach((element) => container.insertBefore(element, this.findAnchor(node)))
		this.handleMount(node, node)
	}

	update(node) {
		const tree = this.createTree(node.first, node.last)
		const container = this.mapNodeIdToElement[node.id]
		// console.log(container)
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

	findAnchor(node) {
		let current = node.next

		while (current) {
			if (current.isRendered) {
				return current.element
			}

			current = current.next
		}

		return null
	}

	onUpdate(node) {
		// console.log(node)
		// make sure that used already existed nodes
		const tree = this.createTree(node.first, node.last)
		const container = this.mapNodeIdToElement[node.id]
		// console.log(container)
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
		// if (event.target.isRendered) {
		// 	return
		// }

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
