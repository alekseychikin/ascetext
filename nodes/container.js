import Node from './node'

export default class Container extends Node {
	constructor(type, attributes = {}) {
		super(type, attributes)

		this.isContainer = true
	}

	get isEmpty() {
		return !this.first || this.first === this.last && this.first.type === 'breakLine'
	}

	accept(node) {
		return node.type === 'text' || node.isInlineWidget
	}

	append(target, anchor, { builder, appendDefault }) {
		if (target.isContainer) {
			builder.append(this, target.first, anchor)
		} else {
			const isEmpty = this.isEmpty && this.first

			if (isEmpty) {
				builder.cut(this.first)
			}

			appendDefault(this, target, isEmpty ? null : anchor)
		}
	}

	enterHandler(
		event,
		{
			builder,
			anchorOffset,
			anchorContainer,
			setSelection,
			focusAtLastPositionInContainer,
			anchorAtFirstPositionInContainer,
		}
	) {
		if (event.shiftKey) {
			event.preventDefault()

			if (focusAtLastPositionInContainer && this.last.type !== 'breakLine') {
				const br = builder.createFragment()

				builder.append(br, builder.create('breakLine'))
				builder.append(br, builder.create('breakLine'))
				builder.append(this, br)
			} else {
				builder.insert(this, builder.create('breakLine'), anchorOffset)
			}

			setSelection(anchorContainer, anchorOffset + 1)
		} else {
			let newBlock

			if (!this.parent.isSection && !this.parent.isGroup) {
				return false
			}

			event.preventDefault()

			if (anchorAtFirstPositionInContainer) {
				builder.append(this.parent, builder.createBlock(), this)
				setSelection(this)
			} else {
				if (focusAtLastPositionInContainer) {
					newBlock = builder.createBlock()
				} else {
					newBlock = this.duplicate(builder)
				}

				builder.append(this.parent, newBlock, this.next)
				builder.moveTail(this, newBlock, anchorOffset)
				setSelection(newBlock)
			}
		}
	}

	backspaceHandler(
		event,
		{
			builder,
			anchorAtFirstPositionInContainer,
			anchorAtLastPositionInContainer,
			anchorContainer,
			setSelection
		}
	) {
		if (anchorAtFirstPositionInContainer) {
			event.preventDefault()

			if (!anchorContainer.parent.isSection && !anchorContainer.parent.isGroup) {
				return false
			}

			const container = anchorContainer
			const previousSelectableNode = container.getPreviousSelectableNode()

			if (!previousSelectableNode) {
				return false
			}

			if (anchorAtLastPositionInContainer) {
				builder.cut(container)

				if (previousSelectableNode.isContainer) {
					setSelection(previousSelectableNode, -1)
				} else if (previousSelectableNode.isWidget) {
					setSelection(previousSelectableNode)
				}
			} else if (previousSelectableNode.isContainer) {
				const offset = previousSelectableNode.getOffset()

				if (previousSelectableNode.isEmpty) {
					if (previousSelectableNode.parent.isSection) {
						builder.cut(previousSelectableNode)
						setSelection(container)
					} else {
						builder.append(previousSelectableNode, container.first)
						builder.cut(container)
						setSelection(previousSelectableNode)
					}
				} else {
					if (container.first) {
						builder.append(previousSelectableNode, container.first)
					}

					builder.cut(container)
					setSelection(previousSelectableNode, offset)
				}
			} else if (previousSelectableNode.isWidget) {
				setSelection(previousSelectableNode)
			}
		}
	}

	deleteHandler(
		event,
		{
			builder,
			anchorAtLastPositionInContainer,
			anchorAtFirstPositionInContainer,
			anchorContainer,
			setSelection
		}
	) {
		if (anchorAtLastPositionInContainer) {
			event.preventDefault()

			if (!anchorContainer.parent.isSection && !anchorContainer.parent.isGroup) {
				return false
			}

			const container = anchorContainer
			const nextSelectableNode = container.getNextSelectableNode()

			if (!nextSelectableNode) {
				return false
			}

			if (anchorAtFirstPositionInContainer) {
				builder.cut(container)

				if (nextSelectableNode.isContainer || nextSelectableNode.isWidget) {
					setSelection(nextSelectableNode)
				}
			} else if (nextSelectableNode.isContainer) {
				const offset = container.getOffset()

				if (!nextSelectableNode.hasOnlyBr) {
					builder.append(container, nextSelectableNode.first)
				}

				builder.cut(nextSelectableNode)

				setSelection(container, offset)
			} else if (nextSelectableNode.isWidget) {
				setSelection(nextSelectableNode)
			}
		}
	}
}
