import Node from './node.js'
import createElement from '../utils/create-element.js'

export default class Container extends Node {
	constructor(type, attributes = {}) {
		super(type, attributes)

		this.isContainer = true
		this.placeholder = null
		this.placeholderHandler = null
		this.removeObserver = null
		this.sizeObserver = null
		this.controls = null
		this.inputHandlerTimer = null
	}

	get isEmpty() {
		return !this.first || this.first === this.last && this.first.type === 'text' && !this.first.length
	}

	fit(node) {
		return node.isSection
	}

	accept(node) {
		return node.isInlineWidget || node.type === 'text'
	}

	onFocus(selection) {
		if (!selection.isRange && this.placeholder) {
			this.invokePlaceholderHandler(true)
		}
	}

	onBlur() {
		if (this.placeholder) {
			this.invokePlaceholderHandler(false)
		}
	}

	onMount({ controls, placeholder, sizeObserver }) {
		if (placeholder) {
			console.log('mount', this)
		// 	this.placeholderHandler = placeholder
		// 	this.controls = controls
		// 	this.sizeObserver = sizeObserver
		// 	this.placeholder = createElement('div', {
		// 		style: {
		// 			'position': 'absolute',
		// 			'pointer-events': 'none',
		// 			'top': '0',
		// 			'left': '0'
		// 		}
		// 	})
		// 	this.controls.registerControl(this.placeholder)
		// 	this.invokePlaceholderHandler(false)
		}
	}

	onUnmount({ controls, placeholder }) {
		if (placeholder) {
			console.log('unmount', this)
		// 	this.hidePlaceholder()
		// 	controls.unregisterControl(this.placeholder)
		}
	}

	onCombine(builder) {
		if (this.parent.isSection) {
			builder.cut(this)
		}
	}

	inputHandler() {
		if (this.placeholder) {
			if (this.inputHandlerTimer) {
				return null
			}

			this.inputHandlerTimer = requestAnimationFrame(() => this.invokePlaceholderHandler(true))
		}
	}

	invokePlaceholderHandler(focused) {
		this.cancelPlaceholderHandler()
		this.placeholderHandler(this.placeholder, this, focused)

		if (!this.length) {
			this.showPlaceholder()
		} else {
			this.hidePlaceholder()
		}
	}

	showPlaceholder() {
		if (this.placeholder) {
			this.removeObserver = this.sizeObserver.observe(this, (entry) => {
				this.placeholder.style.transform = `translate(${entry.element.left}px, ${entry.element.top + entry.scrollTop}px)`
				this.placeholder.style.width = `${entry.element.width}px`
			})
		}
	}

	hidePlaceholder() {
		this.cancelPlaceholderHandler()

		if (this.placeholder && this.removeObserver) {
			this.removeObserver()
			this.removeObserver = null
		}
	}

	cancelPlaceholderHandler() {
		cancelAnimationFrame(this.inputHandlerTimer)
		this.inputHandlerTimer = null
	}

	enterHandler(
		event,
		{
			builder,
			anchorOffset,
			anchorAtFirstPositionInContainer,
			focusAtLastPositionInContainer
		}
	) {
		if (event.shiftKey) {
			event.preventDefault()

			builder.insert(builder.create('breakLine'))
		} else {
			let newBlock

			if (!this.parent.isSection && !this.parent.isGroup) {
				return false
			}

			event.preventDefault()

			if (anchorAtFirstPositionInContainer) {
				builder.append(this.parent, builder.createBlock(), this)
			} else {
				if (focusAtLastPositionInContainer) {
					newBlock = builder.createBlock()
				} else {
					newBlock = builder.duplicate(this)
				}

				builder.append(this.parent, newBlock, this.next)
				builder.moveTail(this, newBlock, anchorOffset)
			}
		}
	}

	backspaceHandler(
		event,
		{
			builder,
			anchorAtFirstPositionInContainer
		}
	) {
		if (anchorAtFirstPositionInContainer) {
			event.preventDefault()

			const previousSelectableNode = this.getPreviousSelectableNode()

			if (!previousSelectableNode) {
				return false
			}

			builder.combine(previousSelectableNode, this)
		}
	}

	deleteHandler(
		event,
		{
			builder,
			anchorAtLastPositionInContainer,
		}
	) {
		if (anchorAtLastPositionInContainer) {
			event.preventDefault()

			const nextSelectableNode = this.getNextSelectableNode()

			if (!nextSelectableNode) {
				return false
			}

			builder.combine(this, nextSelectableNode)
		}
	}
}
