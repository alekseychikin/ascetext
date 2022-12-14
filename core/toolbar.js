import createElement from '../utils/create-element'
import getStyle from '../utils/getStyle'
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
		this.updateBoundings = this.updateBoundings.bind(this)

		this.isShowToggleButtonHolder = false
		this.isShowSideToolbar = false
		this.isShowCenteredToolbar = false
		this.isKeepOpen = false
		this.builder = core.builder
		this.selection = core.selection
		this.timeTravel = core.timeTravel
		this.editing = core.editing
		this.plugins = core.plugins
		this.icons = core.icons
		this.sizeObserver = core.sizeObserver
		this.focusedNodes = []
		this.lastRangeFocused = false
		this.previousSelection = null
		this.nextControlsToRender = null
		this.cancelObserver = null
		this.containerAvatar = createElement('div', {
			style: {
				position: 'fixed',
				bottom: '0',
				right: '0',
				border: '1px solid #000',
				background: '#fff',
				opacity: '0',
				pointerEvents: 'none'
			}
		})

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
		document.body.appendChild(this.toggleButtonHolder)
		document.body.appendChild(this.sideToolbar)
		document.body.appendChild(this.centeredToolbar)
		document.body.appendChild(this.containerAvatar)
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

			if (this.isShowCenteredToolbar) {
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

			if (this.cancelObserver) {
				this.cancelObserver()
				this.cancelObserver = null
			}

			return null
		}

		if (
			!isRange &&
			anchorContainer.isContainer &&
			anchorContainer.isEmpty
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
		this.sizeObserver.update()
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

		// if (hasControls || anchorContainer.parent.isSection) {
		if (hasControls) {
			this.sizeObserver.update()
			this.showToggleButtonHolder()
			this.toggleButton.addEventListener('click', this.toggleSideToolbar)
		} else {
			this.hideToggleButtonHolder()
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

		this.sizeObserver.update()
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
		this.updateBoundings(this.selection.anchorContainer)

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
		this.updateBoundings(this.selection.anchorContainer)

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
		this.sizeObserver.update()
	}

	showCenteredToolbar() {
		this.isShowCenteredToolbar = true
		this.centeredToolbar.classList.remove('hidden')
		this.sizeObserver.update()
	}

	showToggleButtonHolder() {
		this.isShowToggleButtonHolder = true
		this.toggleButtonHolder.classList.remove('hidden')
	}

	hideToggleButtonHolder() {
		this.isShowToggleButtonHolder = false
		this.toggleButtonHolder.classList.add('hidden')
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
		this.hideAvatar()
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

	updateBoundings(container) {
		if (this.cancelObserver) {
			this.cancelObserver()
			this.cancelObserver = null
		}

		this.cancelObserver = this.sizeObserver.observe(container.element, (entry) => {
			if (this.isShowToggleButtonHolder) {
				const sideOffsetTop = entry.element.top - 40 < toolbarIndent
					? entry.element.top + entry.scrollTop + 40
					: entry.element.top + entry.scrollTop - 40
				const sideOffsetLeft = Math.max(entry.element.left - 40, toolbarIndent)

				this.toggleButtonHolder.style.top = `${entry.element.top + entry.scrollTop}px`
				this.toggleButtonHolder.style.left = `${entry.element.left}px`

				if (this.isShowSideToolbar) {
					this.sideToolbar.style.top = `${sideOffsetTop}px`
					this.sideToolbar.style.left = `${Math.max(10, sideOffsetLeft)}px`
				}
			}

			if (this.isShowCenteredToolbar) {
				let centeredOffsetTop = entry.element.top + entry.scrollTop
				let offsetLeft = entry.element.left - this.centeredToolbar.offsetWidth / 2
				let offsetTop

				if (container.isWidget) {
					offsetTop = centeredOffsetTop - this.centeredToolbar.offsetHeight - entry.scrollTop < toolbarIndent
						? centeredOffsetTop + 20
						: centeredOffsetTop - this.centeredToolbar.offsetHeight
					offsetLeft += entry.element.width / 2
				} else {
					const selectedText = this.setAvatar(entry)

					centeredOffsetTop += selectedText.offsetTop
					offsetTop = centeredOffsetTop - this.centeredToolbar.offsetHeight - entry.scrollTop < toolbarIndent
						? centeredOffsetTop + selectedText.offsetHeight + 20
						: centeredOffsetTop - this.centeredToolbar.offsetHeight
					offsetLeft += selectedText.offsetLeft + selectedText.offsetWidth / 2
				}

				this.centeredToolbar.style.top = `${offsetTop}px`
				this.centeredToolbar.style.left = `${Math.max(
					toolbarIndent,
					Math.min(offsetLeft, document.body.clientWidth - this.centeredToolbar.offsetWidth - toolbarIndent)
				)}px`
			}
		})
	}

	setAvatar(entry) {
		const selectedLength = this.selection.focusOffset - this.selection.anchorOffset
		const content = this.selection.anchorContainer.element.outerText
		const styles = getStyle(this.selection.anchorContainer.element)

		this.containerAvatar.style.display = ''
		this.containerAvatar.style.width = `${entry.element.width}px`
		this.containerAvatar.style.fontFamily = styles.fontFamily
		this.containerAvatar.style.fontSize = styles.fontSize
		this.containerAvatar.style.lineHeight = styles.lineHeight
		this.containerAvatar.style.padding = styles.padding
		this.containerAvatar.style.boxSizing = styles.boxSizing
		this.containerAvatar.style.textAlign = styles.textAlign

		const fakeContent = content.substr(0, this.selection.anchorOffset) +
			'<span style="background: blue" data-selected-text>' +
			content.substr(this.selection.anchorOffset, selectedLength) +
			'</span>' +
		content.substr(this.selection.focusOffset)
		this.containerAvatar.innerHTML = fakeContent.replace(/\n/g, '<br />')

		return this.containerAvatar.querySelector('span[data-selected-text]')
	}

	hideAvatar() {
		this.containerAvatar.style.display = 'none'
	}

	destroy() {
		document.body.removeChild(this.toggleButtonHolder)
		document.body.removeChild(this.containerAvatar)
		document.body.removeChild(this.sideToolbar)
		document.body.removeChild(this.centeredToolbar)
		document.removeEventListener('mousedown', this.onMouseDown)
		document.removeEventListener('mouseup', this.onMouseUp)
		document.removeEventListener('keydown', this.onKeyDown)
		document.removeEventListener('keyup', this.onMouseUp)

		if (this.cancelObserver) {
			this.cancelObserver()
		}
	}
}
