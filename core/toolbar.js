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
		this.checkToolbarVisibility = this.checkToolbarVisibility.bind(this)
		this.wrapControls = this.wrapControls.bind(this)
		this.updateBoundings = this.updateBoundings.bind(this)

		this.isShowToggleButtonHolder = false
		this.isShowSideToolbar = false
		this.isShowCenteredToolbar = false
		this.customMode = false
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
		this.sideControls = []
		this.sideMode = 'insert'
		this.cancelObserver = null
		this.previousContainer = null
		this.containerAvatar = createElement('div', {
			style: {
				position: 'fixed',
				bottom: '0',
				right: '0',
				opacity: '0',
				pointerEvents: 'none'
			}
		})

		this.insertButton = createElement('button', {
			'class': this.css.toggleButtonInsert
		})
		this.replaceButton = createElement('button', {
			'class': this.css.toggleButtonReplace
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
		document.addEventListener('pointerdown', this.checkToolbarVisibility)
		document.addEventListener('keyup', this.checkToolbarVisibility)
		document.addEventListener('input', this.checkToolbarVisibility)

		this.selection.onUpdate(this.onSelectionChange)
	}

	onSelectionChange() {
		if (this.selection.focused) {
			this.updateBoundings(this.selection.anchorContainer)
		} else {
			this.stopUpdateBoundings()
		}

		if (!this.customMode) {
			this.updateButtonHolder()
			this.updateCenteredToolbar()
		}
	}

	checkToolbarVisibility(event) {
		if (!this.isTargetInsideToolbar(event.target) && (this.customMode || this.isShowSideToolbar || this.isShowCenteredToolbar)) {
			this.customMode = false
			this.hideSideToolbar()
		}
	}

	onKeyDown(event) {
		if (event.key === 'Escape') {
			this.hideSideToolbar()
			this.hideCenteredToolbar()
		}
	}

	updateButtonHolder() {
		if (!this.selection.focused && !this.isShowSideToolbar) {
			this.hideToggleButtonHolder()
		} else {
			const { anchorContainer, isRange, focused } = this.selection

			if (focused) {
				if (
					!isRange &&
					anchorContainer.isContainer &&
					anchorContainer.isEmpty
				) {
					this.sideMode = 'insert'
					this.sideControls = this.getInsertControls()

					if (this.sideControls.length) {
						this.renderInsertButton()
					} else {
						this.hideToggleButtonHolder()
					}
				} else if (!isRange && (anchorContainer.isContainer && !anchorContainer.isEmpty || anchorContainer.isWidget)) {
					this.sideMode = 'replace'
					this.sideControls = this.getReplaceControls()
					this.renderReplaceButton(this.sideControls.length)
				} else {
					this.hideToggleButtonHolder()
				}
			}
		}
	}

	renderInsertButton() {
		if (this.toggleButton !== this.insertButton) {
			this.emptyToggleButtonHolder()
			this.toggleButton = this.insertButton
			this.toggleButtonHolder.appendChild(this.toggleButton)
			this.toggleButton.addEventListener('click', this.toggleSideToolbar)
		}

		this.sizeObserver.update()
		this.showToggleButtonHolder()
	}

	renderReplaceButton(hasControls) {
		if (this.toggleButton !== this.replaceButton) {
			this.emptyToggleButtonHolder()
			this.toggleButton = this.replaceButton
			this.toggleButtonHolder.appendChild(this.toggleButton)
			this.toggleButton.addEventListener('click', this.toggleSideToolbar)
		}

		// this.toggleButton.className = !hasControls && insideSection
		// 	? this.css.toggleButtonGrab
		// 	: this.css.toggleButtonReplace

		if (hasControls) {
			this.sizeObserver.update()
			this.showToggleButtonHolder()
		} else {
			this.hideToggleButtonHolder()
		}
	}

	updateCenteredToolbar() {
		const { focused } = this.selection

		if (!focused && !this.customMode) {
			this.hideCenteredToolbar()

			return null
		}

		this.renderSelectedToolbar()
	}

	renderInsertToolbar() {
		this.hideSideToolbar()
		this.previousSelection = this.selection.getSelectionInIndexes()

		if (this.sideControls.length) {
			this.renderInsertButton()
			this.renderSideControls()
		}
	}

	renderReplaceToolbar() {
		this.hideSideToolbar()
		this.previousSelection = this.selection.getSelectionInIndexes()

		if (this.sideControls.length) {
			this.renderSideControls()
		}
	}

	renderSelectedToolbar() {
		const controls = []
		const focusedNodes = this.selection.focusedNodes

		if (
			focusedNodes.length !== this.focusedNodes.length ||
			this.selection.isRange ||
			this.lastRangeFocused && !this.selection.isRange ||
			focusedNodes.length
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
		this.selection.restoreSelection()

		if (this.isShowSideToolbar) {
			this.hideSideToolbar()
		} else {
			switch(this.sideMode) {
				case 'insert':
					this.renderInsertToolbar()
					break
				case 'replace':
					this.renderReplaceToolbar()
					break
			}

			this.showSideToolbar()
		}
	}

	renderSideControls() {
		this.emptySideToolbar()

		this.sideControls.forEach((groupControls) => {
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
		this.selection.restoreSelection()
		this.timeTravel.preservePreviousSelection()
		this.customMode = false

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
			this.renderCenteredControls(controls)
			this.customMode = true
		} else {
			this.restoreSelection()
			this.editing.update()
			this.hideSideToolbar()
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
		return this.sideToolbar.contains(target) ||
			this.centeredToolbar.contains(target) ||
			this.toggleButtonHolder.contains(target)
	}

	updateBoundings(container) {
		this.stopUpdateBoundings()
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

	stopUpdateBoundings() {
		if (this.cancelObserver) {
			this.cancelObserver()
			this.cancelObserver = null
		}
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
		document.removeEventListener('pointerdown', this.checkToolbarVisibility)
		document.removeEventListener('keyup', this.checkToolbarVisibility)
		document.removeEventListener('input', this.checkToolbarVisibility)

		this.stopUpdateBoundings()
	}
}
