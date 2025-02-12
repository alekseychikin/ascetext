import createElement from '../utils/create-element.js'
import ComponentComponent from './component.js'
import ControlButton from '../controls/button.js'
import ControlFile from '../controls/file.js'
import ControlInput from '../controls/input.js'
import ControlLink from '../controls/link.js'
import ControlDropdown from '../controls/dropdown.js'
import getStyle from '../utils/get-style.js'

const toolbarIndent = 10

export default class Toolbar extends ComponentComponent {
	get css() {
		return {
			containerSide: 'contenteditor__tooltip contenteditor__tooltip--side',
			containerCentered: 'contenteditor__tooltip contenteditor__tooltip--centered',
			containerMobile: 'contenteditor__tooltip contenteditor__tooltip--mobile',
			containerHidden: 'contenteditor__tooltip--hidden',
			toggleButtonHolder: 'contenteditor__toggle-button-holder',
			toggleButtonHolderHidden: 'contenteditor__toggle-button-holder--hidden',
			toggleButtonInsert: 'contenteditor__toggle-button contenteditor__toggle-button--insert',
			toggleButtonReplace: 'contenteditor__toggle-button contenteditor__toggle-button--replace',
			toggleButtonGrab: 'contenteditor__toggle-button contenteditor__toggle-button--replace contenteditor__toggle-button--move',
			tooltipGroup: 'contenteditor__tooltip-group',
			dragIndicator: 'contenteditor__drag-indicator'
		}
	}

	constructor() {
		super()

		this.onSelectionChange = this.onSelectionChange.bind(this)
		this.controlHandler = this.controlHandler.bind(this)
		this.showSideToolbar = this.showSideToolbar.bind(this)
		this.hideSideToolbar = this.hideSideToolbar.bind(this)
		this.renderSideControls = this.renderSideControls.bind(this)
		this.setSelection = this.setSelection.bind(this)
		this.restoreSelection = this.restoreSelection.bind(this)
		this.toggleSideToolbar = this.toggleSideToolbar.bind(this)
		this.checkToolbarVisibility = this.checkToolbarVisibility.bind(this)
		this.wrapControls = this.wrapControls.bind(this)
		this.updateBoundings = this.updateBoundings.bind(this)
		this.viewportChange = this.viewportChange.bind(this)
		this.viewportResize = this.viewportResize.bind(this)
		this.onKeyDown = this.onKeyDown.bind(this)
		this.onDragNDropChange = this.onDragNDropChange.bind(this)
		this.updateBoundingsHandler = this.updateBoundingsHandler.bind(this)

		this.isShowToggleButtonHolder = false
		this.isShowSideToolbar = false
		this.isShowCenteredToolbar = false
		this.isMobile = true
		this.customMode = false
		this.builder = null
		this.selection = null
		this.timeTravel = null
		this.editing = null
		this.dragndrop = null
		this.plugins = null
		this.icons = null
		this.sizeObserver = null
		this.node = null
		this.focusedNodes = []
		this.lastRangeFocused = false
		this.skip = false
		this.previousSelection = null
		this.previousContainer = null
		this.previousSideMode = ''
		this.nextControlsToRender = null
		this.unsubscribe = null
		this.sideControls = []
		this.centeredControls = []
		this.sideMode = 'insert'
		this.cancelObserver = null
		this.setSelectionInvoked = false

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
		this.dragIndicator = createElement('div', {
			'class': this.css.dragIndicator,
			'style': {
				position: 'fixed'
			}
		})
		this.toggleButton = null
		this.container = document.createElement('div')
		this.mediaQuery = window.matchMedia('(min-width: 640px)')
	}

	register(core) {
		this.builder = core.builder
		this.selection = core.selection
		this.timeTravel = core.timeTravel
		this.editing = core.editing
		this.dragndrop = core.dragndrop
		this.plugins = core.plugins
		this.icons = core.icons
		this.sizeObserver = core.sizeObserver
		this.node = core.node

		this.container.appendChild(this.toggleButtonHolder)
		this.container.appendChild(this.sideToolbar)
		this.container.appendChild(this.centeredToolbar)
		this.container.appendChild(this.containerAvatar)
		this.container.appendChild(this.dragIndicator)
		document.body.appendChild(this.container)
		document.addEventListener('pointerdown', this.checkToolbarVisibility)
		document.addEventListener('keydown', this.onKeyDown)
		document.addEventListener('keyup', this.checkToolbarVisibility)
		document.addEventListener('input', this.checkToolbarVisibility)

		this.unsubscribeSelection = this.selection.subscribe(this.onSelectionChange)
		this.unsubscribeDragNDrop = this.dragndrop.subscribe(this.onDragNDropChange)
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
		if (this.skip) {
			this.skip = false

			return null
		}

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

	onDragNDropChange(event) {
		switch (event.type) {
			case 'dragout':
				event.target.element.classList.remove('target')

				if (this.dragIndicator.parentNode) {
					this.container.removeChild(this.dragIndicator)
				}

				break
			case 'dragover':
				this.toggleButtonHolder.style.pointerEvents = 'none'
				event.target.element.classList.add('target')
				this.updateDragAnchorPosition(event)

				break
			case 'drop':
				if (this.toggleButtonHolder) {
					this.toggleButtonHolder.style.pointerEvents = ''
				}

				if (this.toggleButton) {
					this.toggleButton.style.transform = ''
					this.toggleButton.style.transition = ''
				}

				if (this.dragIndicator.parentNode) {
					this.container.removeChild(this.dragIndicator)
				}

				break
			case 'dragging':
				this.updateDraggingTogglePosition(event)
				this.stopUpdateBoundings()

				break
		}
	}

	updateDraggingTogglePosition(event) {
		this.toggleButton.style.transform = `translate(${event.shiftX}px, ${event.shiftY + event.shiftScrollTop}px)`
		this.toggleButton.style.transition = 'none'
	}

	updateDragAnchorPosition(event) {
		// const scrollTop = document.body.scrollTop || document.documentElement.scrollTop || 0

		if (event.target) {
			const targetBoundings = event.target.element.getBoundingClientRect()
			let top = targetBoundings.top
			let last = event.target.last

			if (last && event.dragging === last) {
				last = last.previous
			}

			if (event.anchor) {
				const anchorBoundings = event.anchor.element.getBoundingClientRect()

				top = anchorBoundings.top
			} else if (last) {
				const anchorBoundings = last.element.getBoundingClientRect()

				top = anchorBoundings.top + anchorBoundings.height
			}

			this.container.appendChild(this.dragIndicator)
			this.dragIndicator.style.width = `${targetBoundings.width}px`
			this.dragIndicator.style.top = `${top}px`
			this.dragIndicator.style.left = `${targetBoundings.left}px`
		}
	}

	checkSelection(target) {
		return this.isTargetInsideToolbar(target)
	}

	checkToolbarVisibility(event) {
		if (!this.isTargetInsideToolbar(event.target) && (this.customMode || this.isShowSideToolbar || this.isShowCenteredToolbar)) {
			this.customMode = false

			if (!this.isMobile) {
				this.hideSideToolbar()

				if (!this.isTargetInsideEditor(event.target)) {
					this.hideCenteredToolbar()
				}
			}
		}
	}

	onKeyDown(event) {
		if (event.key === 'Escape') {
			this.hideSideToolbar()
			this.hideCenteredToolbar()
			this.skip = true
		}
	}

	updateSideToolbar() {
		const { anchorContainer, isRange, focused } = this.selection

		if (!focused || isRange) {
			return null
		}

		if (
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
		} else if (
			anchorContainer.isContainer &&
			!anchorContainer.isEmpty ||
			anchorContainer.isWidget
		) {
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
		const { focused, isRange, selectedComponent } = this.selection

		if (!focused && !selectedComponent || this.isMobile || isRange) {
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
			this.toggleButton.addEventListener('pointerlongdown', (event) => {
				this.dragndrop.handleDragging(this.selection.anchorContainer, event)
			})
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
			this.toggleButton.addEventListener('pointerlongdown', (event) => {
				this.dragndrop.handleDragging(this.selection.anchorContainer, event)
			})
		}

		this.toggleButton.className = !hasControls
			? this.css.toggleButtonGrab
			: this.css.toggleButtonReplace

		this.sizeObserver.update()
		this.showToggleButtonHolder()
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
		const containers = focusedNodes.filter((node) => node.isContainer)

		if (
			focusedNodes.length !== this.focusedNodes.length ||
			this.selection.isRange ||
			this.lastRangeFocused && !this.selection.isRange ||
			focusedNodes.length
		) {
			if (containers.length > 1) {
				const replaceControls = this.getReplaceControls().reduce((result, nodeControls) => {
					if (nodeControls.length) {
						return result.concat(nodeControls)
					}

					return result
				}, [])

				if (replaceControls.length) {
					controls.push([{
						type: 'dropdown',
						controls: replaceControls
					}])
				}
			}

			this.plugins.forEach((plugin) => {
				const nodeControls = plugin.getSelectControls(
					focusedNodes,
					this.selection.isRange
				)

				if (nodeControls.length) {
					controls.push(nodeControls)
				}
			})

			this.previousSelection = this.selection.getSelectionInIndexes()

			if (controls.length && !this.isShowSideToolbar) {
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

		this.plugins.forEach((plugin) => {
			const nodeControls = plugin.getInsertControls(
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

		this.plugins.forEach((plugin) => {
			const nodeControls = plugin.getReplaceControls(
				this.selection.focusedNodes
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
			this.timeTravel.preservePreviousSelection()
			this.customMode = false
		}

		this.setSelectionInvoked = false
		this.previousSelection = this.selection.getSelectionInIndexes()

		const controls = await action(event, this.getActionHandlerParams())

		if (controls && controls.length) {
			this.nextControlsToRender = controls
			this.renderCenteredControls(controls)
			this.customMode = true
		} else if (keep) {
			this.showCenteredToolbar()
		} else {
			if (!this.setSelectionInvoked) {
				this.selection.setSelectionByIndexes(this.previousSelection)
			}

			this.previousSideMode = ''
			this.hideSideToolbar()
		}

		this.builder.commit()
	}

	catchShortcut(shortcutMatcher, event) {
		const shortcuts = this.getShortcuts()
		let shortcut

		for (shortcut in shortcuts) {
			if (shortcutMatcher(shortcut)) {
				this.controlHandler(shortcuts[shortcut], event)

				return true
			}
		}

		return false
	}

	getActionHandlerParams() {
		return {
			builder: this.builder,
			anchorContainer: this.selection.anchorContainer,
			focusContainer: this.selection.focusContainer,
			anchorOffset: this.selection.anchorOffset,
			focusOffset: this.selection.focusOffset,
			restoreSelection: this.restoreSelection,
			setSelection: this.setSelection,
			getSelectedItems: this.selection.getSelectedItems,
			focusedNodes: this.selection.focusedNodes
		}
	}

	setSelection(...params) {
		this.setSelectionInvoked = true
		this.selection.setSelection(...params)
	}

	restoreSelection() {
		if (this.previousSelection !== null) {
			this.lastRangeFocused = false
			this.focusedNodes = []
		}
	}

	emptySideToolbar() {
		this.sideToolbar.innerHTML = ''
	}

	showSideToolbar() {
		this.isShowSideToolbar = true
		this.sideToolbar.className = this.isMobile ? this.css.containerMobile : this.css.containerSide
		this.sizeObserver.update()
		this.hideCenteredToolbar()
	}

	hideSideToolbar() {
		this.isShowSideToolbar = false
		this.lastRangeFocused = false
		this.focusedNodes = []
		this.sideToolbar.classList.add(this.css.containerHidden)
		this.hideAvatar()
	}

	emptyCenteredControls() {
		this.centeredToolbar.innerHTML = ''
	}

	showCenteredToolbar() {
		this.isShowCenteredToolbar = true
		this.centeredToolbar.className = this.isMobile ? this.css.containerMobile : this.css.containerCentered
		this.sizeObserver.update()
	}

	hideCenteredToolbar() {
		this.isShowCenteredToolbar = false
		this.lastRangeFocused = false
		this.focusedNodes = []
		this.centeredControls = []
		this.centeredToolbar.classList.add(this.css.containerHidden)
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
		this.toggleButtonHolder.classList.add(this.css.toggleButtonHolderHidden)
	}

	wrapControls(controls) {
		return controls.map((rawControl) => {
			const control = {
				...rawControl,
				icon: rawControl.icon ? this.icons[rawControl.icon] : '',
				showIcon: true
			}

			switch (control.type) {
				case 'dropdown':
					return new ControlDropdown({
						...control,
						children: this.wrapControls(control.controls.map((control) => ({
							...control,
							showLabel: true
						})))
					})
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

	isTargetInsideEditor(target) {
		return this.node === target || this.node.contains(target)
	}

	updateBoundings(container) {
		this.stopUpdateBoundings()
		this.cancelObserver = this.sizeObserver.observe(container, this.updateBoundingsHandler)
	}

	updateBoundingsHandler(entry, container) {
		if (this.isShowToggleButtonHolder) {
			this.toggleButtonHolder.style.top = `${entry.absolute.top}px`
			this.toggleButtonHolder.style.left = `${entry.absolute.left}px`
			this.toggleButtonHolder.dataset.type = container.type

			if (this.isShowSideToolbar) {
				this.sideToolbar.style.top = `${entry.absolute.top}px`
				this.sideToolbar.style.left = `${Math.max(entry.absolute.left, toolbarIndent)}px`
			}
		}

		if (this.isMobile) {
			this.sideToolbar.style.top = `${visualViewport.height + visualViewport.offsetTop - this.sideToolbar.offsetHeight}px`
			this.sideToolbar.style.left = ''

			this.centeredToolbar.style.top = `${visualViewport.height + visualViewport.offsetTop - this.centeredToolbar.offsetHeight}px`
			this.centeredToolbar.style.left = ''
		} else if (this.isShowCenteredToolbar) {
			let centeredOffsetTop = entry.absolute.top
			let offsetLeft = entry.absolute.left - this.centeredToolbar.offsetWidth / 2
			let offsetTop = 0

			if (container.isWidget) {
				offsetTop = centeredOffsetTop - this.centeredToolbar.offsetHeight < toolbarIndent
					? centeredOffsetTop
					: centeredOffsetTop - this.centeredToolbar.offsetHeight
				offsetLeft += entry.absolute.width / 2
			} else {
				const selectedText = this.setAvatar(entry)

				centeredOffsetTop += selectedText.offsetTop
				offsetTop = centeredOffsetTop - this.centeredToolbar.offsetHeight < toolbarIndent
					? centeredOffsetTop
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

	stopUpdateBoundings() {
		if (this.cancelObserver) {
			this.cancelObserver()
			this.cancelObserver = null
		}
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

	unregister() {
		this.container.removeChild(this.toggleButtonHolder)
		this.container.removeChild(this.containerAvatar)
		this.container.removeChild(this.sideToolbar)
		this.container.removeChild(this.centeredToolbar)
		document.body.removeChild(this.container)
		document.removeEventListener('pointerdown', this.checkToolbarVisibility)
		document.removeEventListener('keyup', this.checkToolbarVisibility)
		document.removeEventListener('input', this.checkToolbarVisibility)
		this.unsubscribeSelection()
		this.unbindViewportChange()
		this.stopUpdateBoundings()
		this.hideToggleButtonHolder()
		this.hideSideToolbar()
		this.hideCenteredToolbar()
	}
}
