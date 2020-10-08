import Component from '../../libs/component'
import layout from './layout'

const arrowLeftKey = 37
const arrowUpKey = 38
const arrowRightKey = 39
const arrowDownKey = 40
export const arrowKeyCodes = [ arrowLeftKey, arrowUpKey, arrowRightKey, arrowDownKey ]

export default class Navigation extends Component {
	handleArrowLeftKeyDown = (event) => {
		const anchorAtFirstPositionInContainer = this.core.selection.anchorAtFirstPositionInContainer
		const anchoredSelectable = this.core.selection.anchorNode.isWidget

		if (anchorAtFirstPositionInContainer || anchoredSelectable) {
			const container = this.core.selection.anchorContainer
			const index = layout.getIndexByNode(anchoredSelectable ? this.core.selection.anchorNode : container)
			let i = 1
			let previousNode

			while (previousNode = layout.getNodeByIndex(index - i)) {
				if (previousNode.isContainer) {
					const lastTextElement = previousNode.findLastTextElement()

					if (lastTextElement) {
						this.core.setPosition(lastTextElement, lastTextElement.length)
					} else {
						this.core.setPosition(previousNode.element, 0)
					}

					previousNode.element.focus({ preventScroll: true })

					break
				}

				if (previousNode.isWidget) {
					previousNode.element.focus({ preventScroll: true })
					this.core.setPosition(previousNode.element, 0)
					break
				}

				i++
			}

			event.preventDefault()
		}
	}

	handleArrowRightKeyDown = (event) => {
		const focusAtLastPositionInContainer = this.core.selection.focusAtLastPositionInContainer
		const focusedSelectable = this.core.selection.focusNode.isWidget

		if (focusAtLastPositionInContainer || focusedSelectable) {
			const index = layout.getIndexByNode(this.core.selection.focusNode)
			let i = 1
			let nextNode

			while (nextNode = layout.getNodeByIndex(index + i)) {
				if (nextNode.isContainer) {
					nextNode.element.focus({ preventScroll: true })
					this.core.setPosition(nextNode.findFirstTextElement() || nextNode.element, 0)
					break
				}

				if (nextNode.isWidget) {
					nextNode.element.focus({ preventScroll: true })
					this.core.setPosition(nextNode.element, 0)
					break
				}

				i++
			}

			event.preventDefault()
		}
	}

	handleArrowKeyDown = (event) => {
		switch (event.keyCode) {
			case arrowLeftKey:
				this.handleArrowLeftKeyDown(event)
				break
			case arrowRightKey:
				this.handleArrowRightKeyDown(event)
				break
		}
	}

	onContentKeyDown = (event) => {
		if (arrowKeyCodes.includes(event.keyCode)) {
			this.core.updateSelection()
			this.handleArrowKeyDown(event)
		}
	}

	events = {
		'keydown': this.onContentKeyDown
	}

	constructor(core) {
		super(core.node)
		this.core = core
	}
}
