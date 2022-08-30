import createElement from '../utils/create-element'
import ControlButton from '../controls/button'
import ControlFile from '../controls/file'
import ControlInput from '../controls/input'
import ControlLink from '../controls/link'

export default class Toolbar {
	get css() {
		return {
			container: 'contenteditor__tooltip',
			containerHidden: 'contenteditor__tooltip hidden',
			toggleButtonHolder: 'contenteditor__toggle-button-holder',
			toggleButtonHolderHidden: 'contenteditor__toggle-button-holder hidden',
			toggleButtonInsert: 'contenteditor__toggle-button contenteditor__toggle-button--insert',
			toggleButtonReplace: 'contenteditor__toggle-button contenteditor__toggle-button--replace',
			tooltipGroup: 'contenteditor__tooltip-group'
		}
	}

	constructor(core) {
		this.onSelectionChange = this.onSelectionChange.bind(this)
		this.controlHandler = this.controlHandler.bind(this)
		this.showTooltip = this.showTooltip.bind(this)
		this.hideTooltip = this.hideTooltip.bind(this)
		this.renderControls = this.renderControls.bind(this)
		this.restoreSelection = this.restoreSelection.bind(this)
		this.getSelectedItems = this.getSelectedItems.bind(this)
		this.toggleTooltip = this.toggleTooltip.bind(this)
		this.onMouseDown = this.onMouseDown.bind(this)
		this.onMouseUp = this.onMouseUp.bind(this)
		this.onKeyDown = this.onKeyDown.bind(this)
		this.wrapControls = this.wrapControls.bind(this)

		this.lastTooltipType = ''
		this.isShowTooltip = false
		this.isKeepOpen = false
		this.builder = core.builder
		this.selection = core.selection
		this.timeTravel = core.timeTravel
		this.editing = core.editing
		this.plugins = core.plugins
		this.icons = core.icons
		this.focusedNodes = []
		this.lastFocusedRange = false
		this.previousSelection = null
		this.nextControlsToRender = null

		this.tooltip = createElement('div', {
			'class': this.css.containerHidden
		})
		this.toggleButtonHolder = createElement('div', {
			'class': this.css.toggleButtonHolderHidden
		})
		this.toggleButton = null
		document.body.appendChild(this.tooltip)
		document.body.appendChild(this.toggleButtonHolder)
		document.addEventListener('mousedown', this.onMouseDown)
		document.addEventListener('mouseup', this.onMouseUp)
		document.addEventListener('keydown', this.onKeyDown)
		document.addEventListener('keyup', this.onMouseUp)

		this.selection.onUpdate(this.onSelectionChange)
	}

	onSelectionChange() {
		if (this.isKeepOpen) {
			this.isKeepOpen = false
		} else {
			this.updateTooltip()
		}
	}

	onMouseDown(event) {
		if (this.tooltip.contains(event.target) || this.toggleButtonHolder.contains(event.target)) {
			this.isKeepOpen = true
		} else if (this.lastTooltipType !== 'selection' && this.isShowTooltip) {
			this.hideTooltip()
		}
	}

	onKeyDown(event) {
		if (event.keyCode === 27) {
			this.hideTooltip()
		} else if (this.tooltip.contains(event.target) || this.toggleButtonHolder.contains(event.target)) {
			this.isKeepOpen = true
		}
	}

	onMouseUp() {
		setTimeout(() => this.isKeepOpen = false, 100)
	}

	blurFocusedNodes() {
		this.focusedNodes.forEach((node) => {
			if (typeof node.onBlur === 'function') {
				node.onBlur()
			}
		})
	}

	updateTooltip() {
		if (!this.selection.focused) {
			this.hideTooltip()
			this.hideToggleButtonHolder()

			return
		}

		if (
			!this.selection.isRange &&
			this.selection.anchorContainer.isContainer &&
			this.selection.anchorContainer.isEmpty
		) {
			this.renderInsertButton()
		} else if (
			!this.selection.isRange &&
			this.selection.anchorContainer.isContainer &&
			!this.selection.anchorContainer.isEmpty
		) {
			this.renderReplaceButton()
		}

		this.renderSelectedTooltip()
	}

	renderInsertButton() {
		this.toggleButtonHolder.innerHTML = ''

		if (this.renderInsertTooltip()) {
			this.toggleButton = createElement('button', {
				'class': this.css.toggleButtonInsert
			})
			this.toggleButtonHolder.appendChild(this.toggleButton)
			this.toggleButton.addEventListener('click', this.toggleTooltip)
			this.hideTooltip()
			this.renderToggleButtonHolder()
			this.showToggleButtonHolder()
		}
	}

	renderReplaceButton() {
		this.toggleButtonHolder.innerHTML = ''

		if (this.renderReplaceTooltip()) {
			this.toggleButton = createElement('button', {
				'class': this.css.toggleButtonReplace
			})
			this.toggleButtonHolder.appendChild(this.toggleButton)
			this.toggleButton.addEventListener('click', this.toggleTooltip)
			this.hideTooltip()
			this.renderToggleButtonHolder()
			this.showToggleButtonHolder()
		}
	}

	renderSelectedTooltip() {
		const controls = []
		let focusedNodes = this.selection.selectedItems
		let firstNode = focusedNodes[0]

		while (firstNode && firstNode !== this.selection.anchorContainer.parent) {
			focusedNodes.push(firstNode)
			firstNode = firstNode.parent
		}

		focusedNodes = focusedNodes.filter((node, index, self) => self.indexOf(node) === index)

		if (
			focusedNodes.length !== this.focusedNodes.length ||
			this.selection.isRange ||
			this.lastFocusedRange && !this.selection.isRange ||
			focusedNodes.filter((node, index) => this.focusedNodes[index] !== node).length
		) {
			Object.keys(this.plugins).forEach((type) => {
				if (this.plugins[type].getSelectControls) {
					const nodeControls = this.wrapControls(this.plugins[type].getSelectControls(
						focusedNodes,
						this.selection.isRange
					))

					if (nodeControls.length) {
						controls.push(nodeControls)
					}
				}
			})

			this.previousSelection = this.selection.getSelectionInIndexes()

			if (controls.length) {
				this.renderControls(controls)
				this.showTooltip(focusedNodes.length === 1 && focusedNodes[0].isWidget ? 'settings' : 'selection')
			} else {
				this.hideTooltip()
			}
		} else {
			this.setPosition()
		}

		// this.hideToggleButtonHolder()
		this.lastFocusedRange = this.selection.isRange
		this.focusedNodes = focusedNodes
	}

	renderInsertTooltip() {
		this.emptyTooltip()

		const controls = []

		Object.keys(this.plugins).forEach((type) => {
			if (this.plugins[type].getInsertControls) {
				const nodeControls = this.wrapControls(this.plugins[type].getInsertControls(
					this.selection.anchorContainer
				))

				if (nodeControls.length) {
					controls.push(nodeControls)
				}
			}
		})

		this.previousSelection = this.selection.getSelectionInIndexes()

		if (controls.length) {
			this.renderControls(controls)

			return true
		}

		return false
	}

	renderReplaceTooltip() {
		this.emptyTooltip()

		const controls = []

		Object.keys(this.plugins).forEach((type) => {
			if (this.plugins[type].getReplaceControls) {
				const nodeControls = this.wrapControls(this.plugins[type].getReplaceControls(
					this.selection.anchorContainer
				))

				if (nodeControls.length) {
					controls.push(nodeControls)
				}
			}
		})

		this.previousSelection = this.selection.getSelectionInIndexes()

		if (controls.length) {
			this.renderControls(controls)

			return true
		}

		return false
	}

	toggleTooltip() {
		if (this.isShowTooltip) {
			this.hideTooltip()
		} else {
			this.showTooltip('insert')
			this.setPosition('begin')
		}
	}

	renderControls(rawControls) {
		this.emptyTooltip()

		const controlsToRender = this.nextControlsToRender ? this.nextControlsToRender : rawControls

		this.nextControlsToRender = null
		controlsToRender.forEach((groupControls) => {
			const group = createElement(
				'div',
				{
					'class': this.css.tooltipGroup
				},
				groupControls.map((control) => control.getElement())
			)

			this.tooltip.appendChild(group)
			groupControls.forEach((control) =>
				control.setEventListener(this.controlHandler)
			)
		})
	}

	controlHandler(action, event) {
		this.timeTravel.preservePreviousSelection()

		const controls = action(event, {
			builder: this.builder,
			anchorContainer: this.selection.anchorContainer,
			focusContainer: this.selection.focusContainer,
			restoreSelection: this.restoreSelection,
			setSelection: this.selection.setSelection,
			renderControls: this.renderControls,
			getSelectedItems: this.getSelectedItems
		})

		if (controls && controls.length) {
			this.nextControlsToRender = controls
			this.restoreSelection()
		} else {
			this.restoreSelection()
			this.editing.update()
		}
	}

	restoreSelection() {
		if (this.previousSelection !== null) {
			this.lastFocusedRange = false
			this.focusedNodes = []
			this.selection.forceUpdate = true
			this.selection.setSelectionByIndexes(this.previousSelection)
		}
	}

	getSelectedItems() {
		this.restoreSelection()

		return this.selection.getSelectedItems()
	}

	emptyTooltip() {
		this.tooltip.innerHTML = ''
	}

	showTooltip(type) {
		this.isShowTooltip = true
		this.lastTooltipType = type
		this.tooltip.classList.remove('hidden')
		this.setPosition(type === 'settings' ? 'center' : 'caret')
	}

	showToggleButtonHolder() {
		this.toggleButtonHolder.classList.remove('hidden')
	}

	hideToggleButtonHolder() {
		this.toggleButtonHolder.classList.add('hidden')
	}

	renderToggleButtonHolder() {
		this.toggleButtonHolder.style.top = this.selection.boundings.container.top + 'px'
		this.toggleButtonHolder.style.left = this.selection.boundings.container.left + 'px'
	}

	setPosition(position = 'caret') {
		if (!this.isShowTooltip) {
			return null
		}

		let offsetTop = this.selection.boundings.container.top
		let offsetLeft = this.selection.boundings.container.left

		if (position === 'caret') {
			offsetTop = this.selection.boundings.caret.top - this.tooltip.offsetHeight
			offsetLeft =
				this.selection.boundings.caret.left +
				this.selection.boundings.caret.width / 2 -
				this.tooltip.offsetWidth / 2
		} else if (position === 'center') {
			offsetTop -= this.tooltip.offsetHeight
			offsetLeft += this.selection.boundings.container.width / 2 - this.tooltip.offsetWidth / 2
		} else {
			offsetTop -= 40
			offsetLeft -= 40
		}

		this.tooltip.style.top = offsetTop + 'px'
		this.tooltip.style.left = Math.max(10, offsetLeft) + 'px'
	}

	hideTooltip() {
		this.isShowTooltip = false
		this.lastFocusedRange = false
		this.focusedNodes = []
		this.tooltip.classList.add('hidden')
	}

	wrapControls(controls) {
		return controls.map((rawControl) => {
			const control = {
				...rawControl,
				icon: rawControl.icon ? this.icons[rawControl.icon] : ''
			}

			switch (control.type) {
				case 'input':
					return new ControlInput(control)
				case 'file':
					return new ControlFile(control)
				case 'link':
					return new ControlLink(control)
				default:
					return new ControlButton(control)
			}
		})
	}

	destroy() {
		document.body.removeChild(this.tooltip)
		document.body.removeChild(this.toggleButtonHolder)
		document.removeEventListener('mousedown', this.onMouseDown)
		document.removeEventListener('mouseup', this.onMouseUp)
		document.removeEventListener('keydown', this.onKeyDown)
		document.removeEventListener('keyup', this.onMouseUp)
	}
}
