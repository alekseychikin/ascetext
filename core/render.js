import Publisher from './publisher.js'
import isTextElement from '../utils/is-text-element.js'
import isElementBr from '../utils/is-element-br.js'
import createElement from '../utils/create-element.js'
import findParent, { hasRoot } from '../utils/find-parent.js'
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

const getTextLog = (node) => {
	const output = []

	output.push(`${node.type} (${node.id})`)

	return output.join(' | ')
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
						// console.log(change)
						// this.pushContainer(change.container)
						this.queue.push({
							type: change.type,
							container: change.container,
							target: current
						})
						// console.log('append', getTextLog(change.container), window.printTree(current))

						break
					case operationTypes.CUT:
						// console.log(change)
						// this.pushRemoveNodes(change)
						// this.markUnrendered(current)
						this.queue.push({
							type: change.type,
							container: change.container,
							target: current
						})
						// console.log('cut', getTextLog(change.container), window.printTree(current))

						break
					case operationTypes.ATTRIBUTE:
						// console.log(change)
						// this.pushUpdateNode(change.target)
						this.queue.push({
							type: change.type,
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
			// console.log('push', node)
			this.updatedNodes.push(node)
			node.isRendered = false
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

	dropRender() {
		cancelAnimationFrame(this.timer)
	}

	render() {
		const queue = this.queue.splice(0).reduce((result, current) => {
			if (current.type === operationTypes.APPEND && (!current.container.contains(current.target) || !current.container.isMount)) {
				// console.log('→ current', current.target, current.type)
				return result
			}

			if (current.type === 'update' && !current.target.isMount) {
				return result
			}

			// for (i = 0; i < result.length; i++) {
			// 	if (current.target !== result[i].target && result[i].target.contains(current.target)) {
			// 		// console.log('↓ current', 'result[i]', result[i].target, current.target, result[i].type, current.type)
			// 		return result
			// 	}

			// 	if (current.target !== result[i].target && current.target.contains(result[i].target)) {
			// 		// console.log('↑ current', current.target, 'result[i]', result[i].target, current.type, result[i].type)
			// 		result.splice(i, 1)

			// 		break
			// 	}

			// 	if (current.type === 'update' && result[i].type === current.type && current.target === result[i].target) {
			// 		result.splice(i, 1)

			// 		break
			// 	}
			// }

			result.push(current)

			return result
		}, [])
		let event

		// app root (1) → list (36) — я добавляю лист, и на момент добавления в нём есть list-item (58), но так как дальше я его удаляю, то здесь его уже нет
		// cut list (36) → list-item (58) — и значит здесь удалять нечего
		// cut root (1) → list (36) — получается, что с контейнерами тоже нужно что-то делать

		// console.log('document to render')
		// console.log(window.printTree(this.core.model))

		// console.log('plan')

		// queue.forEach((item) => {
		// 	switch (item.type) {
		// 		case 'update':
		// 			console.log('upd', getTextLog(item.target))
		// 			break
		// 		case 'append':
		// 			console.log('app', `${getTextLog(item.container)} → ${getTextLog(item.target)}`)
		// 			break
		// 		case 'cut':
		// 			console.log('cut', `${getTextLog(item.container)} → ${getTextLog(item.target)}`)
		// 			break
		// 	}
		// })

		const added = []
		const updated = []

		// console.log('actions')

		while (event = queue.shift()) {
			switch (event.type) {
				case operationTypes.CUT:
					// console.log('cut', `${getTextLog(event.container)} → ${getTextLog(event.target)}`)
					this.onCut(event)

					break
				case operationTypes.APPEND:
					added.push(event)

					break
				default:
					updated.push(event)
			}
		}

		while (event = added.shift()) {
			// console.log('app', `${getTextLog(event.container)} → ${getTextLog(event.target)}`)
			this.onAppend(event)
		}

		while (event = updated.shift()) {
			this.update(event.target)
		}

		// console.log('render finished')
	}

	append({ element: container }, node) {
		const tree = this.createTree(node, node)
		const elements = tree.map((element) => this.createElement(element))

		elements.forEach((element) => container.insertBefore(element, this.findAnchor(node)))
		this.handleMount(node, node)
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
		const tree = this.createTree(event.target, event.target)
		// console.log('tree', tree)
		const elements = tree.map((element) => this.createElement(element))

		elements.forEach((element) => container.insertBefore(element, this.findAnchor(event.target)))
		this.handleMount(event.target, event.target)
	}

	onCut(event) {
		const element = this.mapNodeIdToElement[event.target.id]

		if (event.target.isMount) {
			element.parentNode.removeChild(element)
			this.handleUnmount(event.target, event.target)
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

		lookaheadChildren.forEach((child) => element.removeChild(child))

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

	handleContainer(element) {
		const isEmpty = !element.childNodes.length || isTextElement(element.childNodes[0]) && !element.childNodes[0].length
		const hasLastBr = element.childNodes.length && isElementBr(element.lastChild)

		// console.log('handleContainer', element, isEmpty, hasLastBr)

		if (isEmpty || hasLastBr) {
			element.appendChild(this.getTrailingBr())
		}
	}

	handleMount(node, last) {
		let current = node

		while (current) {
			current.isRendered = true
			current.element = this.mapNodeIdToElement[current.id]

			if (current.parent.isMount) {
				current.isMount = true
			}

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
			if (current.isMount && isFunction(current.onUnmount)) {
				if (current.isContainer || current.isWidget) {
					current.onUnmount(this.core)
				} else {
					console.error('onUnmount method only for containers and widgets')
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

	getTrailingBr() {
		const trailingBr = document.createElement('br')

		trailingBr.setAttribute('data-trailing', '')

		return trailingBr
	}

	getNodeById(id) {
		return this.mapNodeIdToNode[id]
	}
}
