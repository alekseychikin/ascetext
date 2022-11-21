import createElement from '../utils/create-element'
import ControlButton from '../controls/button'
import ControlFile from '../controls/file'
import ControlInput from '../controls/input'
import ControlLink from '../controls/link'

const toolbarIndent = 10

export default class Toolbar {
	get css() {
		return {
			container: 'contenteditor__tooltip',
			containerHidden: 'contenteditor__tooltip hidden',
			toggleButtonHolder: 'contenteditor__toggle-button-holder',
			toggleButtonHolderHidden: 'contenteditor__toggle-button-holder hidden',
			toggleButtonInsert: 'contenteditor__toggle-button contenteditor__toggle-button--insert',
			toggleButtonReplace: 'contenteditor__toggle-button contenteditor__toggle-button--replace',
			toggleButtonGrab: 'contenteditor__toggle-button contenteditor__toggle-button--replace contenteditor__toggle-button--move',
			tooltipGroup: 'contenteditor__tooltip-group'
		}
	}

	constructor(core) {
		this.onSelectionChange = this.onSelectionChange.bind(this)
		this.controlHandler = this.controlHandler.bind(this)
		this.showSideToolbar = this.showSideToolbar.bind(this)
		this.hideSideToolbar = this.hideSideToolbar.bind(this)
		this.renderSideControls = this.renderSideControls.bind(this)
		this.restoreSelection = this.restoreSelection.bind(this)
		this.getSelectedItems = this.getSelectedItems.bind(this)
		this.toggleSideToolbar = this.toggleSideToolbar.bind(this)
		this.onMouseDown = this.onMouseDown.bind(this)
		this.onMouseUp = this.onMouseUp.bind(this)
		this.onKeyDown = this.onKeyDown.bind(this)
		this.wrapControls = this.wrapControls.bind(this)

		this.isShowSideToolbar = false
		this.isCenteredToolbar = false
		this.isKeepOpen = false
		this.builder = core.builder
		this.selection = core.selection
		this.timeTravel = core.timeTravel
		this.editing = core.editing
		this.plugins = core.plugins
		this.icons = core.icons
		this.focusedNodes = []
		this.lastRangeFocused = false
		this.previousSelection = null
		this.nextControlsToRender = null

		this.sideToolbar = createElement('div', {
			'class': this.css.containerHidden
		})
		this.centeredToolbar = createElement('div', {
			'class': this.css.containerHidden
		})
		this.toggleButtonHolder = createElement('div', {
			'class': this.css.toggleButtonHolderHidden
		})
		this.toggleButton = null
		document.body.appendChild(this.sideToolbar)
		document.body.appendChild(this.centeredToolbar)
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
			this.updateSideToolbar()
			this.updateCenteredToolbar()
		}
	}

	onMouseDown(event) {
		if (this.isTargetInsideToolbar(event.target)) {
			this.isKeepOpen = true
		} else {
			if (this.isShowSideToolbar) {
				this.hideSideToolbar()
			}

			if (this.isCenteredToolbar) {
				this.hideCenteredToolbar()
			}
		}
	}

	onKeyDown(event) {
		if (event.key === 'Escape') {
			this.hideSideToolbar()
			this.hideCenteredToolbar()
		} else if (this.isTargetInsideToolbar(event.target)) {
			this.isKeepOpen = true
		}
	}

	onMouseUp() {
		setTimeout(() => this.isKeepOpen = false, 100)
	}

	updateSideToolbar() {
		const { anchorContainer, isRange, focused } = this.selection

		if (!focused) {
			this.hideSideToolbar()
			this.hideToggleButtonHolder()

			return null
		}

		if (
			!isRange &&
			anchorContainer.isContainer &&
			anchorContainer.isEmpty &&
			anchorContainer.parent.isSection
		) {
			this.renderInsertToolbar()
		} else if (!isRange && (anchorContainer.isContainer && !anchorContainer.isEmpty || anchorContainer.isWidget)) {
			this.renderReplaceToolbar()
		} else {
			this.hideSideToolbar()
			this.hideToggleButtonHolder()
		}
	}

	updateCenteredToolbar() {
		const { focused } = this.selection

		if (!focused) {
			console.log('hide centered toolbar')
			this.hideCenteredToolbar()

			return null
		}

		this.renderSelectedToolbar()
	}

	renderInsertToolbar() {
		const controls = this.getInsertControls()

		this.hideSideToolbar()
		this.previousSelection = this.selection.getSelectionInIndexes()

		if (controls.length) {
			this.emptySideToolbar()
			this.renderInsertButton()
			this.renderSideControls(controls)
		}
	}

	renderReplaceToolbar() {
		const controls = this.getReplaceControls()

		this.hideSideToolbar()
		this.emptySideToolbar()
		this.renderReplaceButton(controls.length > 0)
		this.previousSelection = this.selection.getSelectionInIndexes()

		if (controls.length) {
			this.renderSideControls(controls)
		}
	}

	renderInsertButton() {
		this.emptyToggleButtonHolder()
		this.toggleButton = createElement('button', {
			'class': this.css.toggleButtonInsert
		})
		this.toggleButtonHolder.appendChild(this.toggleButton)
		this.toggleButton.addEventListener('click', this.toggleSideToolbar)
		this.setPositionToggleButtonHolder()
		this.showToggleButtonHolder()
	}

	renderReplaceButton(hasControls) {
		const { anchorContainer } = this.selection

		this.emptyToggleButtonHolder()
		this.toggleButton = createElement('button', {
			'class': !hasControls && anchorContainer.parent.isSection
				? this.css.toggleButtonGrab
				: this.css.toggleButtonReplace
		})
		this.toggleButtonHolder.appendChild(this.toggleButton)
		this.setPositionToggleButtonHolder()
		this.showToggleButtonHolder()

		if (hasControls) {
			this.toggleButton.addEventListener('click', this.toggleSideToolbar)
		}
	}

	renderSelectedToolbar() {
		const controls = []
		const focusedNodes = this.selection.focusedNodes

		if (
			focusedNodes.length !== this.focusedNodes.length ||
			this.selection.isRange ||
			this.lastRangeFocused && !this.selection.isRange ||
			focusedNodes.filter((node, index) => this.focusedNodes[index] !== node).length
		) {
			Object.keys(this.plugins).forEach((type) => {
				const nodeControls = this.plugins[type].getSelectControls(
					focusedNodes,
					this.selection.isRange
				)

				if (nodeControls.length) {
					controls.push(nodeControls)
				}
			})

			this.previousSelection = this.selection.getSelectionInIndexes()

			if (controls.length) {
				this.renderCenteredControls(controls)
				this.showCenteredToolbar()
			} else {
				this.hideCenteredToolbar()
			}
		}

		this.setPositionCenteredToolbar()

		this.lastRangeFocused = this.selection.isRange
		this.focusedNodes = focusedNodes
	}

	getInsertControls() {
		const controls = []

		Object.keys(this.plugins).forEach((type) => {
			const nodeControls = this.plugins[type].getInsertControls(
				this.selection.anchorContainer
			)

			if (nodeControls.length) {
				controls.push(nodeControls)
			}
		})

		return controls
	}

	getReplaceControls() {
		this.emptySideToolbar()

		const controls = []

		Object.keys(this.plugins).forEach((type) => {
			const nodeControls = this.plugins[type].getReplaceControls(
				this.selection.anchorContainer
			)

			if (nodeControls.length) {
				controls.push(nodeControls)
			}
		})

		return controls
	}

	toggleSideToolbar() {
		if (this.isShowSideToolbar) {
			this.hideSideToolbar()
		} else {
			this.showSideToolbar()
		}
	}

	renderSideControls(nextControls) {
		this.emptySideToolbar()

		nextControls.forEach((groupControls) => {
			const controls = this.wrapControls(groupControls)
			const group = createElement(
				'div',
				{
					'class': this.css.tooltipGroup
				},
				controls.map((control) => control.getElement())
			)

			this.sideToolbar.appendChild(group)
			controls.forEach((control) =>
				control.setEventListener(this.controlHandler)
			)
		})
	}

	renderCenteredControls(rawControls) {
		const controlsToRender = this.nextControlsToRender ? this.nextControlsToRender : rawControls

		this.emptyCenteredControls()
		this.nextControlsToRender = null

		controlsToRender.forEach((groupControls) => {
			const controls = this.wrapControls(groupControls)
			const group = createElement(
				'div',
				{
					'class': this.css.tooltipGroup
				},
				controls.map((control) => control.getElement())
			)

			this.centeredToolbar.appendChild(group)
			controls.forEach((control) =>
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
			getSelectedItems: this.getSelectedItems,
			focusedNodes: this.selection.focusedNodes
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
			this.lastRangeFocused = false
			this.focusedNodes = []
			this.selection.restoreSelection()
		}
	}

	getSelectedItems() {
		this.restoreSelection()

		return this.selection.getSelectedItems()
	}

	emptySideToolbar() {
		this.sideToolbar.innerHTML = ''
	}

	emptyCenteredControls() {
		this.centeredToolbar.innerHTML = ''
	}

	emptyToggleButtonHolder() {
		this.toggleButtonHolder.innerHTML = ''
	}

	showSideToolbar() {
		this.isShowSideToolbar = true
		this.sideToolbar.classList.remove('hidden')
		this.setPositionSideToolbar()
	}

	showCenteredToolbar() {
		this.isCenteredToolbar = true
		this.centeredToolbar.classList.remove('hidden')
		this.setPositionCenteredToolbar()
	}

	showToggleButtonHolder() {
		this.toggleButtonHolder.classList.remove('hidden')
	}

	hideToggleButtonHolder() {
		this.toggleButtonHolder.classList.add('hidden')
	}

	setPositionToggleButtonHolder() {
		if (this.selection.boundings.container) {
			this.toggleButtonHolder.style.top = this.selection.boundings.container.top + 'px'
			this.toggleButtonHolder.style.left = this.selection.boundings.container.left + 'px'
		}
	}

	setPositionSideToolbar() {
		if (!this.isShowSideToolbar) {
			return null
		}

		const scrollTop = document.body.scrollTop || document.documentElement.scrollTop || 0
		const offsetTop = this.selection.boundings.container.top - scrollTop - 40 < toolbarIndent
			? this.selection.boundings.container.top + 40
			: this.selection.boundings.container.top - 40
		const offsetLeft = Math.max(this.selection.boundings.container.left - 40, toolbarIndent)

		this.sideToolbar.style.top = offsetTop + 'px'
		this.sideToolbar.style.left = Math.max(10, offsetLeft) + 'px'
	}

	setPositionCenteredToolbar() {
		const scrollTop = document.body.scrollTop || document.documentElement.scrollTop || 0
		const offsetTop = this.selection.boundings.caret.top - this.centeredToolbar.offsetHeight - scrollTop < toolbarIndent
			? this.selection.boundings.caret.top + this.selection.boundings.caret.height + 20
			: this.selection.boundings.caret.top - this.centeredToolbar.offsetHeight
		const offsetLeft =
			this.selection.boundings.caret.left +
			this.selection.boundings.caret.width / 2 -
			this.centeredToolbar.offsetWidth / 2

		this.centeredToolbar.style.top = offsetTop + 'px'
		this.centeredToolbar.style.left = Math.max(
			toolbarIndent,
			Math.min(offsetLeft, document.body.clientWidth - this.centeredToolbar.offsetWidth - toolbarIndent)
		) + 'px'
	}

	hideSideToolbar() {
		this.isShowSideToolbar = false
		this.lastRangeFocused = false
		this.focusedNodes = []
		this.sideToolbar.classList.add('hidden')
	}

	hideCenteredToolbar() {
		this.isShowCenteredToolbar = false
		this.lastRangeFocused = false
		this.focusedNodes = []
		this.centeredToolbar.classList.add('hidden')
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

	isTargetInsideToolbar(target) {
		if (
			this.sideToolbar.contains(target) ||
			this.centeredToolbar.contains(target) ||
			this.toggleButtonHolder.contains(target)
		) {
			return true
		}

		return false
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
