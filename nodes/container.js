import Node from './node.js'
import createElement from '../utils/create-element.js'

export default class Container extends Node {
	constructor(type, attributes = {}, params = {}) {
		super(type, attributes, params)

		this.isContainer = true
		this.placeholder = null
		this.placeholderHandler = null
		this.removeObserver = null
		this.sizeObserver = null
		this.controls = null
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
			this.inputHandler(true)
		}
	}

	onBlur() {
		if (this.placeholder) {
			this.inputHandler(false)
		}
	}

	onMount({ controls, placeholder, sizeObserver }) {
		if (placeholder) {
			this.placeholderHandler = placeholder
			this.controls = controls
			this.sizeObserver = sizeObserver
			this.placeholder = createElement('div', {
				style: {
					'position': 'absolute',
					'pointer-events': 'none',
					'top': '0',
					'left': '0',
					'display': 'none'
				},
				'data-id': this.id
			})
			this.controls.registerControl(this.placeholder)
		}
	}

	onUnmount({ controls }) {
		if (this.placeholder) {
			this.hidePlaceholder()
			controls.unregisterControl(this.placeholder)
		}
	}

	onCombine(builder) {
		if (this.parent.isSection) {
			builder.cut(this)
		}
	}

	inputHandler(focused) {
		if (this.placeholder) {
			const show = this.placeholderHandler(this.placeholder, this, focused)

			if (!this.element.outerText.trim().length && show) {
				this.showPlaceholder()
			} else {
				this.hidePlaceholder()
			}
		}
	}

	showPlaceholder() {
		if (this.placeholder) {
			this.removeObserver = this.sizeObserver.observe(this, (entry) => {
				this.placeholder.style.transform = `translate(${entry.element.left}px, ${entry.element.top + entry.scrollTop}px)`
				this.placeholder.style.width = `${entry.element.width}px`
			})
			this.placeholder.style.display = ''
		}
	}

	hidePlaceholder() {
		if (this.placeholder && this.removeObserver) {
			this.placeholder.style.display = 'none'
			this.removeObserver()
			this.removeObserver = null
		}
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

			if (!this.parent.isSection) {
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
			setSelection
		}
	) {
		if (anchorAtLastPositionInContainer) {
			event.preventDefault()

			const nextSelectableNode = this.getNextSelectableNode()

			if (!nextSelectableNode) {
				return false
			}

			if (this.isEmpty) {
				builder.cut(this)
				setSelection(nextSelectableNode)
			} else {
				builder.combine(this, nextSelectableNode)
			}
		}
	}
}
