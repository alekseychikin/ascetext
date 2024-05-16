import { getNodeByElement } from '../utils/map-element-to-node.js'
import isHtmlElement from '../utils/is-html-element.js'
import isTextElement from '../utils/is-text-element.js'
import isElementBr from '../utils/is-element-br.js'
import walk from '../utils/walk.js'
import createElement from '../utils/create-element.js'
import getStyle from '../utils/get-style.js'
import findParent from '../utils/find-parent.js'
import isFunction from '../utils/is-function.js'
import { operationTypes } from '../core/builder.js'

const blockElements = [
	'br',
	'address',
	'article',
	'aside',
	'blockquote',
	'canvas',
	'dd',
	'div',
	'dl',
	'dt',
	'fieldset',
	'figcaption',
	'figure',
	'footer',
	'form',
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'header',
	'hr',
	'li',
	'main',
	'nav',
	'noscript',
	'ol',
	'p',
	'pre',
	'section',
	'table',
	'tfoot',
	'ul',
	'video'
]
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
const textElements = [
	'em',
	'i',
	'strong',
	'b',
	'span',
	's',
	'u'
]
const beginSpacesRegexp = /^[^\S\u00A0]+/
const finishSpacesRegexp = /[^\S\u00A0]+$/
const groupSpacesRegexp = /[^\S\u00A0]+/g
const trailingBrs = []
const mapModifierToTag = {
	bold: 'strong',
	italic: 'em',
	strike: 's',
	underlined: 'u'
}
const supportTags = {
	bold: ['strong', 'b'],
	italic: ['em', 'i'],
	strike: 's',
	underlined: 'u'
}

function isTextTag(element) {
	return element.nodeType === 1 && textElements.includes(element.nodeName.toLowerCase())
}

export default class DOMHost {
	constructor(core) {
		this.core = core

		this.createElement = this.createElement.bind(this)
		this.focus = this.focus.bind(this)
		this.selectionChange = this.selectionChange.bind(this)
		this.onChange = this.onChange.bind(this)
		this.render = this.render.bind(this)

		this.selectionHandlers = []
		this.selectionTimeout = null
		this.components = []
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

		document.addEventListener('focus', this.focus, true)
		document.addEventListener('selectionchange', this.selectionChange)
		document.body.appendChild(this.containerAvatar)
	}

	setComponents(components) {
		this.components = components
	}

	onChange(change) {
		let parent

		switch (change.type) {
			case operationTypes.APPEND:
				parent = findParent(change.container, (parent) => parent.isContainer)

				if (parent) {
					parent.isRendered = false
					this.queue.push({
						type: 'update',
						container: parent
					})
				} else {
					this.queue.push({
						type: change.type,
						container: change.container,
						target: change.target,
						last: change.last,
						anchor: change.anchor
					})
				}

				break
			case operationTypes.CUT:
				parent = findParent(change.container, (parent) => parent.isContainer)

				if (parent) {
					parent.isRendered = false
					this.queue.push({
						type: 'update',
						container: parent
					})
				} else {
					this.queue.push({
						type: change.type,
						container: change.container,
						target: change.target,
						last: change.last
					})
				}

				break
		}

		cancelAnimationFrame(this.timer)
		this.timer = requestAnimationFrame(this.render)
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
				default:
					this.onUpdate(event.container)
			}
		}
	}

	// если происходит обновление ноды, которая находится в фокусе,
	// нужно это обновление восстанавливать
	onUpdate(node) {
		console.info('rendered', node)
		// перепроверить переиспользование реальных нодов
		const tree = this.createTree(node.first, node.last)
		const container = this.mapNodeIdToElement[node.id]
		const lookahead = Array.prototype.slice.call(container.childNodes)
		const elements = tree.map((element) => this.createElement(element, lookahead))

		elements.forEach((element) => container.appendChild(element))
		lookahead.forEach((element) => {
			if (isElementBr(element)) {
				const index = trailingBrs.indexOf(element)

				if (index > -1) {
					trailingBrs.splice(index, 1)
				}
			}

			container.removeChild(element)
		})

		if (!container.childNodes.length || isElementBr(container.lastChild)) {
			container.appendChild(this.getTrailingBr())
		}

		node.isRendered = true

		if (this.anchorNode === node || this.focusNode === node) {
			this.setSelection()
		}
	}

	onAppend(event) {
		const container = this.mapNodeIdToElement[event.container.id]
		const tree = this.createTree(event.target, event.last)
		const elements = tree.map((element) => this.createElement(element))

		elements.forEach((element) => container.insertBefore(element, event.anchor ? this.mapNodeIdToElement[event.anchor.id] : null))
		this.handleMount(event.target, event.last)
	}

	onCut(event) {
		const container = this.mapNodeIdToElement[event.container.id]
		let element = event.target

		this.handleUnmount(event.target, event.last)

		while (element) {
			container.removeChild(this.mapNodeIdToElement[element.id])

			if (element === event.last) {
				break
			}

			element = element.next
		}
	}

	onAttribute(change) {
		const tree = this.createTree(change.target, change.target)[0]
		let container = this.mapNodeIdToElement[change.target.id]

		if (tree.type !== container.nodeName.toLowerCase()) {
			this.mapNodeIdToElement[change.target.id] = container = this.replaceNode(tree, container)
		}

		this.applyAttributes(container, tree)
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
		// сделать поддержку ref-ов, которые должны представлять собой прокси

		if (tree.type === 'text') {
			return this.createText(tree, this.generateModifiers(tree), lookahead)
		}

		const lookaheadElement = this.findLookahead(lookahead, tree.type)
		const lookaheadChildren = lookaheadElement ? Array.prototype.slice.call(lookaheadElement.childNodes) : []
		const element = lookaheadElement || document.createElement(tree.type)

		this.applyAttributes(element, tree)

		if (tree.id) {
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
		const currentsAttributes = this.getAttributes(element)
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
		const node = this.createElement(tree)

		container.parentNode.insertBefore(node, container)
		container.parentNode.removeChild(container)

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
					if (isElementBr(lookahead[i]) && trailingBrs.indexOf(lookahead[i]) > -1) {
						return null
					}

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

			if (isFunction(current.onMount)) {
				if (current.isContainer || current.isWidget) {
					current.onMount(this.core)
				} else {
					console.error('onMount method only for containers and widgets')
				}
			}

			if (this.anchorNode === current || this.focusNode === current) {
				this.setSelection()
			}

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

			this.handleMount(current.first)

			if (current === last) {
				break
			}

			current = current.next
		}
	}

	getVirtualTree(node) {
		let body = []
		let current = node
		let elements

		while (current) {
			if (isTextElement(current) || isTextTag(current)) {
				elements = this.getTextElement(current)
			} else if (isHtmlElement(current)) {
				elements = this.getHtmlElement(current)
			}

			if (elements) {
				body = body.concat(elements)
			}

			current = current.nextSibling
		}

		// console.log(body)
		return this.normalize(body.filter(Boolean))
	}

	normalize(tree) {
		let i
		let current
		let next

		for (i = 0; i < tree.length - 1; i++) {
			current = tree[i]
			next = tree[i + 1]

			if (current.type === next.type) {
				switch (current.type) {
					case 'a':
						if (this.isEqualAttributes(current, next, ['href', 'target'])) {
							current.body = this.normalize(current.body.concat(next.body))
							tree.splice(i + 1, 1)
							i--
						}

						break
					case 'text':
						if (this.isEqualAttributes(current, next, ['weight', 'style', 'strike', 'decoration'])) {
							current.attributes.content += next.attributes.content
							tree.splice(i + 1, 1)
							i--
						}

						break
				}
			}
		}

		return tree
	}

	isEqualAttributes(left, right, attributes) {
		let equal = true

		attributes.forEach((attribute) => {
			if (left.attributes[attribute] !== right.attributes[attribute]) {
				equal = false
			}
		})

		return equal
	}

	getHtmlElement(current) {
		if (isElementBr(current) && trailingBrs.includes(current)) {
			return null
		}

		return [{
			type: current.nodeName.toLowerCase(),
			attributes: this.getAttributes(current),
			body: this.getVirtualTree(current.firstChild)
		}]
	}

	getTextElement(current, context = {}) {
		let content = current.nodeValue

		if (isHtmlElement(current)) {
			const tagName = current.nodeName.toLowerCase()

			if (supportTags.bold.includes(tagName)) {
				context.weight = 'bold'
			}

			if (supportTags.italic.includes(tagName)) {
				context.style = 'italic'
			}

			if (supportTags.strike === tagName) {
				context.strike = 'horizontal'
			}

			if (supportTags.underlined === tagName) {
				context.decoration = 'underlined'
			}

			if (tagName === 'span') {
				if (
					(
						current.style['font-weight'] === 'bold' ||
						current.style['font-weight'] === '600' ||
						current.style['font-weight'] === '500' ||
						current.style['font-weight'] === '700'
					)
				) {
					context.weight = 'bold'
				}

				if (current.style['font-style'] === 'italic') {
					context.style = 'italic'
				}

				if (current.style['text-decoration'].split(' ').includes('line-through')) {
					context.strike = 'horizontal'
				}

				if (current.style['text-decoration'].split(' ').includes('underline')) {
					context.decoration = 'underlined'
				}
			}

			let children = []
			let i

			for (i = 0; i < current.childNodes.length; i++) {
				children = children.concat(this.getTextElement(current.childNodes[i], { ...context }))
			}

			return children
		}

		if (
			!current.previousSibling && blockElements.includes(current.parentNode.nodeName.toLowerCase()) ||
			current.previousSibling && isHtmlElement(current.previousSibling) && blockElements.includes(current.previousSibling.nodeName.toLowerCase())
		) {
			content = content.replace(beginSpacesRegexp, '')
		}

		if (!current.nextSibling && blockElements.includes(current.parentNode.nodeName.toLowerCase()) ||
			current.nextSibling && isHtmlElement(current.nextSibling) && blockElements.includes(current.nextSibling.nodeName.toLowerCase())
		) {
			content = content.replace(finishSpacesRegexp, '')
		}

		content = content.replace(groupSpacesRegexp, ' ')

		if (!content.length) {
			return null
		}

		return [{
			type: 'text',
			attributes: {
				content,
				...context
			},
			body: []
		}]
	}

	getAttributes(current) {
		const attributes = {}
		let i

		for (i = 0; i < current.attributes.length; i++) {
			attributes[current.attributes[i].nodeName.toLowerCase()] = current.attributes[i].nodeValue
		}

		return attributes
	}

	// remove(current) {
	// 	if (current.element && current.element.parentNode) {
	// 		const parent = current.element.parentNode

	// 		parent.removeChild(current.element)

	// 		if (containerElements.includes(parent.nodeName.toLowerCase()) && !parent.childNodes.length) {
	// 			parent.appendChild(this.getTrailingBr())
	// 		}
	// 	}
	// }

	// append(node, target, anchor) {
	// 	this.render(node)
	// 	this.render(target)

	// 	if (anchor) {
	// 		this.render(anchor)
	// 	}

	// 	const lastChild = node.element.lastChild
	// 	const trailingIndex = lastChild && isElementBr(lastChild) ? trailingBrs.indexOf(lastChild) : -1

	// 	if (!anchor && trailingIndex >= 0) {
	// 		trailingBrs.splice(trailingIndex, 1)
	// 		node.element.removeChild(lastChild)
	// 	}

	// 	node.element.insertBefore(target.element, anchor ? anchor.element : null)

	// 	if (!anchor && isElementBr(target.element)) {
	// 		node.element.appendChild(this.getTrailingBr())
	// 	}
	// }

	getTrailingBr() {
		const trailingBr = document.createElement('br')

		trailingBr.setAttribute('data-trailing', '')
		trailingBrs.push(trailingBr)

		return trailingBr
	}

	focus(event) {
		if (!document.body.contains(event.srcElement)) {
			return
		}

		if (this.core.node.contains(event.srcElement) && (typeof event.srcElement.dataset.widget === 'undefined' || this.core.node === event.srcElement)) {
			return
		}

		cancelAnimationFrame(this.selectionTimeout)
		this.selectionTimeout = requestAnimationFrame(() => {
			const selectedComponent = this.components.find((component) => component.checkSelection(event.srcElement))

			this.selectionUpdate({
				type: 'focus',
				anchorNode: event.srcElement,
				focusNode: event.srcElement,
				anchorOffset: 0,
				focusOffset: 0,
				isCollapsed: true,
				selectedComponent: Boolean(selectedComponent)
			})
		})
	}

	selectionChange() {
		cancelAnimationFrame(this.selectionTimeout)
		this.selectionTimeout = requestAnimationFrame(() => {
			const selection = document.getSelection()
			const selectedComponent = this.components.find((component) => component.checkSelection(selection.anchorNode))

			this.selectionUpdate({
				type: 'selectionchange',
				anchorNode: selection.anchorNode,
				focusNode: selection.focusNode,
				anchorOffset: selection.anchorOffset,
				focusOffset: selection.focusOffset,
				isCollapsed: selection.isCollapsed,
				selectedComponent: Boolean(selectedComponent)
			})
		})
	}

	selectionUpdate(event) {
		const { container: anchorContainer, offset: anchorOffset} = this.getContainerAndOffset(event.anchorNode, event.anchorOffset)
		let focusContainer = anchorContainer
		let focusOffset = anchorOffset

		if (!event.isCollapsed) {
			const focus = this.getContainerAndOffset(event.focusNode, event.focusOffset)

			focusContainer = focus.container
			focusOffset = focus.offset
		}

		const focused = this.core.node.contains(anchorContainer) && this.core.node.contains(focusContainer)

		this.emitUpdateSelection(
			focused ? this.mapNodeIdToNode[anchorContainer.dataset.nodeId] : null,
			anchorOffset,
			focused ? this.mapNodeIdToNode[focusContainer.dataset.nodeId] : null,
			focusOffset,
			event.isCollapsed,
			focused,
			event.selectedComponent
		)
	}

	getContainerAndOffset(node, offset) {
		let container = node
		let element = node
		let length = offset

		if (isHtmlElement(element) && element.dataset.nodeId) {
			if (element.childNodes[offset] && isElementBr(element.childNodes[offset])) {
				return this.getContainerAndOffset(element.childNodes[offset], 0)
			}

			return {
				container,
				offset
			}
		}

		while (element.previousSibling || element.parentNode) {
			if (!element.previousSibling) {
				element = element.parentNode

				if (isHtmlElement(element) && element.dataset.nodeId) {
					container = element

					break
				}

				continue
			}

			element = element.previousSibling
			length += this.getLength(element)
		}

		return {
			container,
			offset: length
		}
	}

	getLength(node) {
		if (isTextElement(node)) {
			return node.length
		}

		if (isElementBr(node)) {
			return 1
		}

		let length = 0
		let child = node.firstChild

		while (child) {
			length += this.getLength(child)

			child = child.nextSibling
		}

		return length
	}

	emitUpdateSelection(anchorContainer, anchorOffset, focusContainer, focusOffset, isCollapsed, focused, selectedComponent) {
		this.selectionHandlers.forEach((handler) => handler({
			anchorContainer,
			anchorOffset,
			focusContainer,
			focusOffset,
			isCollapsed,
			focused,
			selectedComponent
		}))
	}

	onSelectionChange(handler) {
		this.selectionHandlers.push(handler)
	}

	getChildByOffset(target, offset) {
		const element = this.mapNodeIdToElement[target.id]
		let restOffset = Math.min(offset, target.length)

		if (target.isWidget && !offset) {
			return {
				element: this.mapNodeIdToElement[target.id],
				restOffset: 0
			}
		}

		const result = walk(element, (current) => {
			if (isTextElement(current)) {
				if (current.length >= restOffset) {
					return current
				}

				restOffset -= current.length
			} else if (isElementBr(current)) {
				if (restOffset === 0) {
					return current
				}

				restOffset -= 1
			}
		})

		return {
			element: result,
			restOffset
		}
	}

	getOffset(target, element) {
		let index = 0

		if (target.isWidget) {
			return 0
		}

		walk(target.element, (current) => {
			if (current === element) {
				return true
			}

			if (isTextElement(current)) {
				index += current.length
			} else if (isElementBr(current)) {
				if (current === target.element.lastChild) {
					return true
				}

				index += 1
			}
		})

		return index
	}

	selectElements(anchorNode, anchorOffset, focusNode, focusOffset) {
		console.error('select elements', anchorNode, anchorOffset, focusNode, focusOffset)
		console.log(anchorNode.isRendered, focusNode ? focusNode.isRendered : null)
		this.anchorNode = anchorNode
		this.anchorOffset = anchorOffset
		this.focusNode = focusNode
		this.focusOffset = focusOffset

		if (anchorNode.isRendered && (!focusNode || focusNode.isRendered)) {
			this.setSelection()
		}

		this.emitUpdateSelection(
			anchorNode,
			anchorOffset,
			focusNode || anchorNode,
			focusNode ? focusOffset : anchorOffset,
			focusNode ? anchorNode === focusNode && anchorOffset === focusOffset : true,
			true,
			false
		)
	}

	setSelection() {
		console.log('set selection')

		const selection = window.getSelection()
		const { element: anchorElement, restOffset: anchorRestOffset } = this.getChildByOffset(this.anchorNode, this.anchorOffset)

		selection.collapse(anchorElement, anchorRestOffset)

		if (this.focusNode) {
			const { element: focusElement, restOffset: focusRestOffset } = this.getChildByOffset(this.focusNode, this.focusOffset)

			console.log('focusElement', focusElement, focusRestOffset)
			selection.extend(focusElement, focusRestOffset)
		}
	}

	getBoundings(node) {
		return this.mapNodeIdToElement[node.id].getBoundingClientRect()
	}

	getSelectedBoundings(anchorContainer, anchorOffset, focusContainer, focusOffset) {
		const selectedLength = anchorContainer === focusContainer ? focusOffset - anchorOffset : anchorContainer.length - anchorOffset
		const anchorElement = this.mapNodeIdToElement[anchorContainer.id]
		const content = anchorElement.outerText
		const styles = getStyle(anchorElement)

		this.containerAvatar.style.display = ''
		this.containerAvatar.style.width = `${anchorElement.offsetWidth}px`
		this.containerAvatar.style.fontFamily = styles.fontFamily
		this.containerAvatar.style.fontSize = styles.fontSize
		this.containerAvatar.style.lineHeight = styles.lineHeight
		this.containerAvatar.style.letterSpacing = styles.letterSpacing
		this.containerAvatar.style.padding = styles.padding
		this.containerAvatar.style.boxSizing = styles.boxSizing
		this.containerAvatar.style.textAlign = styles.textAlign

		const fakeContent = content.substr(0, anchorOffset) +
			'<span style="background: blue" data-selected-text>' +
			content.substr(anchorOffset, selectedLength) +
			'</span>' +
		content.substr(anchorOffset + selectedLength)
		this.containerAvatar.innerHTML = fakeContent.replace(/\n/g, '<br />')
		const span = this.containerAvatar.querySelector('span[data-selected-text]')

		// нужно возвращать прокси
		return {
			left: span.offsetLeft,
			top: span.offsetTop,
			width: span.offsetWidth,
			height: span.offsetHeight
		}
	}

	hideAvatar() {
		this.containerAvatar.style.display = 'none'
	}
}
