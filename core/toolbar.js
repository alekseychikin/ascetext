import createElement from '../utils/create-element.js'
import getStyle from '../utils/getStyle.js'
import ControlButton from '../controls/button.js'
import ControlFile from '../controls/file.js'
import ControlInput from '../controls/input.js'
import ControlLink from '../controls/link.js'

const toolbarIndent = 10

export default class Toolbar {
	get css() {
		return {
			container: 'contenteditor__tooltip',
			containerMobile: 'contenteditor__tooltip contenteditor__tooltip--mobile',
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
		this.viewportChange = this.viewportChange.bind(this)
		this.viewportResize = this.viewportResize.bind(this)

		this.isShowToggleButtonHolder = false
		this.isShowSideToolbar = false
		this.isShowCenteredToolbar = false
		this.isMobile = true
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
		this.previousContainer = null
		this.previousSideMode = ''
		this.nextControlsToRender = null
		this.sideControls = []
		this.centeredControls = []
		this.sideMode = 'insert'
		this.cancelObserver = null
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
		visualViewport.addEventListener('resize', this.viewportResize)
		visualViewport.addEventListener('scroll', this.viewportResize)

		this.selection.onUpdate(this.onSelectionChange)

		this.mediaQuery = window.matchMedia('(min-width: 640px)')
		this.bindViewportChange()
	}

	viewportChange(event) {
		this.isMobile = !event.matches
		this.viewportResize()
		this.onSelectionChange()
	}

	viewportResize() {
		this.sizeObserver.update()
	}

	bindViewportChange() {
		this.mediaQuery.addEventListener('change', this.viewportChange)
		this.viewportChange(this.mediaQuery)
	}

	unbindViewportChange() {
		this.mediaQuery.removeEventListener('change', this.viewportChange)
	}

	onSelectionChange() {
		if (this.selection.focused) {
			this.updateBoundings(this.selection.anchorContainer)
		} else {
			this.stopUpdateBoundings()
		}

		if (!this.customMode) {
			this.updateSideToolbar()
			this.updateCenteredToolbar()
			this.updateButtonHolder()
		}
	}

	checkToolbarVisibility(event) {
		if (!this.isTargetInsideToolbar(event.target) && (this.customMode || this.isShowSideToolbar || this.isShowCenteredToolbar)) {
			this.customMode = false

			if (!this.isMobile) {
				this.hideSideToolbar()
			}
		}
	}

	onKeyDown(event) {
		if (event.key === 'Escape') {
			this.hideSideToolbar()
			this.hideCenteredToolbar()
		}
	}

	updateSideToolbar() {
		const { anchorContainer, isRange, focused } = this.selection

		if (!focused) {
			return null
		}

		if (
			!isRange &&
			anchorContainer.isContainer &&
			anchorContainer.isEmpty
		) {
			this.sideMode = 'insert'

			if (this.previousSideMode !== this.sideMode || this.previousContainer !== anchorContainer) {
				this.sideControls = this.getInsertControls()
				this.previousSideMode = this.sideMode
				this.previousContainer = anchorContainer
				this.renderSideToolbar()
			}
		} else if (!isRange && (anchorContainer.isContainer && !anchorContainer.isEmpty || anchorContainer.isWidget)) {
			this.sideMode = 'replace'

			if (this.previousSideMode !== this.sideMode || this.previousContainer !== anchorContainer) {
				this.sideControls = this.getReplaceControls()
				this.previousSideMode = this.sideMode
				this.previousContainer = anchorContainer
				this.renderSideToolbar()
			}
		}
	}

	updateCenteredToolbar() {
		const { focused } = this.selection

		if (!focused && !this.customMode) {
			return null
		}

		this.renderSelectedToolbar()
	}

	updateButtonHolder() {
		const { focused } = this.selection

		if (!focused && !this.isShowSideToolbar || this.isMobile) {
			this.hideToggleButtonHolder()
		} else if (focused) {
			if (this.sideMode === 'insert') {
				if (this.sideControls.length) {
					this.renderInsertButton()
				} else {
					this.hideToggleButtonHolder()
				}
			} else {
				this.renderReplaceButton(this.sideControls.length)
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

	renderSideToolbar() {
		this.previousSelection = this.selection.getSelectionInIndexes()

		if (this.sideControls.length) {
			this.renderSideControls()

			if (this.isMobile) {
				this.showSideToolbar()
			}
		} else {
			this.hideSideToolbar()
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
		this.centeredControls = this.nextControlsToRender ? this.nextControlsToRender : rawControls
		this.emptyCenteredControls()
		this.nextControlsToRender = null
		this.updateBoundings(this.selection.anchorContainer)
		this.centeredControls.forEach((groupControls) => {
			const controls = this.wrapControls(groupControls)
			const group = createElement(
				'div',
				{
					'class': this.css.tooltipGroup
				},
				controls.map((control) => control.getElement())
			)

			this.centeredToolbar.appendChild(group)
			controls.forEach((control) => {
				control.setEventListener(this.controlHandler)
			})
		})
	}

	async controlHandler(action, event, keep = false) {
		if (!keep) {
			this.selection.restoreSelection()
			this.timeTravel.preservePreviousSelection()
			this.customMode = false
		}

		const controls = await action(event, this.getActionHandlerParams())

		if (controls && controls.length) {
			this.nextControlsToRender = controls
			this.renderCenteredControls(controls)
			this.customMode = true
		} else if (keep) {
			this.showCenteredToolbar()
		} else {
			this.restoreSelection()
			this.editing.update()
			this.hideSideToolbar()
		}
	}

	getActionHandlerParams() {
		return {
			builder: this.builder,
			anchorContainer: this.selection.anchorContainer,
			focusContainer: this.selection.focusContainer,
			restoreSelection: this.restoreSelection,
			setSelection: this.selection.setSelection,
			getSelectedItems: this.getSelectedItems,
			focusedNodes: this.selection.focusedNodes
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

	showSideToolbar() {
		this.isShowSideToolbar = true
		this.sideToolbar.className = this.isMobile ? this.css.containerMobile : this.css.container
		this.sizeObserver.update()
	}

	hideSideToolbar() {
		this.isShowSideToolbar = false
		this.lastRangeFocused = false
		this.focusedNodes = []
		this.sideToolbar.className = this.css.containerHidden
	}

	emptyCenteredControls() {
		this.centeredToolbar.innerHTML = ''
	}

	showCenteredToolbar() {
		this.isShowCenteredToolbar = true
		this.centeredToolbar.className = this.isMobile ? this.css.containerMobile : this.css.container
		this.sizeObserver.update()
	}

	hideCenteredToolbar() {
		this.isShowCenteredToolbar = false
		this.lastRangeFocused = false
		this.focusedNodes = []
		this.centeredControls = []
		this.centeredToolbar.className = this.css.containerHidden
		this.hideAvatar()
	}

	emptyToggleButtonHolder() {
		this.toggleButtonHolder.innerHTML = ''
	}

	showToggleButtonHolder() {
		this.isShowToggleButtonHolder = true
		this.toggleButtonHolder.className = this.css.toggleButtonHolder
	}

	hideToggleButtonHolder() {
		this.isShowToggleButtonHolder = false
		this.toggleButtonHolder.className = this.css.toggleButtonHolderHidden
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

			if (this.isMobile) {
				this.sideToolbar.style.top = `${visualViewport.height + visualViewport.offsetTop - this.sideToolbar.offsetHeight}px`
				this.sideToolbar.style.left = ''

				this.centeredToolbar.style.top = `${visualViewport.height + visualViewport.offsetTop - this.centeredToolbar.offsetHeight}px`
				this.centeredToolbar.style.left = ''
			} else if (this.isShowCenteredToolbar) {
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
			} else {
				const offsetLeft = parseInt(this.centeredToolbar.style.left)

				if (offsetLeft + this.centeredToolbar.offsetWidth > document.body.clientWidth) {
					this.centeredToolbar.style.left = '0'
				}
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
		this.containerAvatar.style.letterSpacing = styles.letterSpacing
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

	getShortcuts() {
		const shortcuts = {}

		function walk(nodes) {
			nodes.forEach((node) => {
				if (typeof node.forEach === 'function') {
					walk(node)
				} else if (typeof node.shortcut === 'string') {
					shortcuts[node.shortcut] = node.action
				}
			})
		}

		walk(this.sideControls)
		walk(this.centeredControls)

		return shortcuts
	}

	destroy() {
		document.body.removeChild(this.toggleButtonHolder)
		document.body.removeChild(this.containerAvatar)
		document.body.removeChild(this.sideToolbar)
		document.body.removeChild(this.centeredToolbar)
		document.removeEventListener('pointerdown', this.checkToolbarVisibility)
		document.removeEventListener('keyup', this.checkToolbarVisibility)
		document.removeEventListener('input', this.checkToolbarVisibility)
		visualViewport.removeEventListener('resize', this.viewportResize)
		visualViewport.removeEventListener('scroll', this.viewportResize)

		this.unbindViewportChange()
		this.stopUpdateBoundings()
	}
}
