import createElement from '../utils/create-element.js'
import ComponentComponent from './component.js'
import ControlButton from '../controls/button.js'
import ControlFile from '../controls/file.js'
import ControlInput from '../controls/input.js'
import ControlLink from '../controls/link.js'
import ControlDropdown from '../controls/dropdown.js'
import getStyle from '../utils/get-style.js'

export default class Toolbar extends ComponentComponent {
	get css() {
		return {
			toolbarSide: 'contenteditor__toolbar contenteditor__toolbar--side',
			toolbarCentered: 'contenteditor__toolbar contenteditor__toolbar--centered',
			toolbarContent: 'contenteditor__toolbar-content',
			toolbarMobile: 'contenteditor__toolbar contenteditor__toolbar--mobile',
			toolbarHidden: 'contenteditor__toolbar--hidden',
			toolbarGroup: 'contenteditor__toolbar-group',
			toggleButtonHolder: 'contenteditor__toggle-button-holder',
			toggleButtonHolderHidden: 'contenteditor__toggle-button-holder--hidden',
			toggleButton: 'contenteditor__toggle-button',
			toggleButtonGrab: 'contenteditor__toggle-button contenteditor__toggle-button--move',
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
		this.scrollableParents = []
		this.toolbarIndent = 46

		this.toggleButton = createElement('button', {
			'class': this.css.toggleButton
		})
		this.sideToolbarContent = createElement('div', {
			'class': this.css.toolbarContent
		})
		this.sideToolbar = createElement('div', {
			'class': this.css.toolbarHidden
		}, [this.sideToolbarContent])
		this.centeredToolbarContent = createElement('div', {
			'class': this.css.toolbarContent
		})
		this.centeredToolbar = createElement('div', {
			'class': this.css.toolbarHidden
		}, [this.centeredToolbarContent])
		this.toggleButtonHolder = createElement('div', {
			'class': [this.css.toggleButtonHolder, this.css.toggleButtonHolderHidden].join(' ')
		}, [this.toggleButton])
		this.dragIndicator = createElement('div', {
			'class': this.css.dragIndicator,
			'style': {
				position: 'fixed'
			}
		})
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

		this.scrollableParents = this.findScrollableParents(core.node)

		this.container.appendChild(this.toggleButtonHolder)
		this.container.appendChild(this.sideToolbar)
		this.container.appendChild(this.centeredToolbar)
		this.container.appendChild(this.dragIndicator)
		document.body.appendChild(this.container)
		document.addEventListener('pointerdown', this.checkToolbarVisibility)
		document.addEventListener('keydown', this.onKeyDown)
		document.addEventListener('keyup', this.checkToolbarVisibility)
		document.addEventListener('input', this.checkToolbarVisibility)
		this.toggleButton.addEventListener('click', this.toggleSideToolbar)
		this.toggleButton.addEventListener('pointerlongdown', (event) => {
			this.dragndrop.handleDragging(this.selection.anchorContainer, event)
		})

		this.unsubscribeSelection = this.selection.subscribe(this.onSelectionChange)
		this.unsubscribeDragNDrop = this.dragndrop.subscribe(this.onDragNDropChange)
		this.bindViewportChange()
	}

	findScrollableParents(element) {
		const parents = []
		let current = element

		while (current) {
			const style = getStyle(current)
			const overflow = style.overflow || style.overflowX || style.overflowY

			if (overflow === 'auto' || overflow === 'scroll') {
				parents.push(current)
			}

			current = current.parentElement
		}

		return parents
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
			case 'dragstart':
				setTimeout(() => {
					const rect = this.selection.anchorContainer.element.getBoundingClientRect()

					this.toggleButtonHolder.style.transform = 'translate(0, 0)'
					this.toggleButtonHolder.style.top = `${rect.top}px`
					this.toggleButtonHolder.style.left = `${rect.left}px`
				}, 0)

				break
			case 'dragout':
				event.target.element.classList.remove('target')

				if (this.dragIndicator.parentNode) {
					this.container.removeChild(this.dragIndicator)
				}

				break
			case 'dragover':
				event.target.element.classList.add('target')
				this.toggleButtonHolder.style.pointerEvents = 'none'
				this.updateDragAnchorPosition(event)

				break
			case 'drop':
				if (this.toggleButtonHolder) {
					this.toggleButtonHolder.style.pointerEvents = 'auto'
					this.toggleButtonHolder.style.transform = ''
					this.toggleButtonHolder.style.top = ''
					this.toggleButtonHolder.style.left = ''
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
		this.toggleButtonHolder.style.transform = `translate(${event.shiftX}px, ${event.shiftY}px)`
	}

	updateDragAnchorPosition(event) {
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
			this.renderButton(this.sideControls.length)
		}
	}

	renderButton(hasControls) {
		this.toggleButton.className = !hasControls
			? this.css.toggleButtonGrab
			: this.css.toggleButton

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
		} else if (this.sideControls.length) {
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
					'class': this.css.toolbarGroup
				},
				controls.map((control) => control.getElement())
			)

			this.sideToolbarContent.appendChild(group)
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
					'class': this.css.toolbarGroup
				},
				controls.map((control) => control.getElement())
			)

			this.centeredToolbarContent.appendChild(group)
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
		this.sideToolbarContent.innerHTML = ''
	}

	showSideToolbar() {
		this.isShowSideToolbar = true
		this.sideToolbar.className = this.isMobile ? this.css.toolbarMobile : this.css.toolbarSide
		this.sizeObserver.update()
		this.hideCenteredToolbar()
	}

	hideSideToolbar() {
		this.isShowSideToolbar = false
		this.lastRangeFocused = false
		this.focusedNodes = []
		this.sideToolbar.classList.add(this.css.toolbarHidden)
	}

	emptyCenteredControls() {
		this.centeredToolbarContent.innerHTML = ''
	}

	showCenteredToolbar() {
		this.isShowCenteredToolbar = true
		this.centeredToolbar.className = this.isMobile ? this.css.toolbarMobile : this.css.toolbarCentered
		this.sizeObserver.update()
	}

	hideCenteredToolbar() {
		this.isShowCenteredToolbar = false
		this.lastRangeFocused = false
		this.focusedNodes = []
		this.centeredControls = []
		this.centeredToolbar.classList.add(this.css.toolbarHidden)
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
			const isToggleVisible = this.isElementVisible(entry.absolute)

			this.setPosition(this.toggleButtonHolder, entry.absolute.left, entry.absolute.top)
			this.toggleButtonHolder.dataset.type = container.type
			this.toggleButtonHolder.classList.toggle(this.css.toggleButtonHolderHidden, !isToggleVisible)

			if (this.isShowSideToolbar) {
				this.setPosition(this.sideToolbar, entry.absolute.left, entry.absolute.top)
				this.sideToolbar.classList.toggle(this.css.toolbarHidden, !isToggleVisible)
				this.sideToolbar.toggleAttribute('data-flip', entry.absolute.top - this.sideToolbar.offsetHeight < 0)
			}
		}

		if (this.isMobile) {
			this.sideToolbar.style.top = `${visualViewport.height + visualViewport.offsetTop - this.sideToolbar.offsetHeight}px`
			this.sideToolbar.style.left = ''

			this.centeredToolbar.style.top = `${visualViewport.height + visualViewport.offsetTop - this.centeredToolbar.offsetHeight}px`
			this.centeredToolbar.style.left = ''
		} else if (this.isShowCenteredToolbar) {
			let offsetTop = entry.absolute.top - this.centeredToolbar.offsetHeight
			let offsetLeft = entry.absolute.left - this.centeredToolbar.offsetWidth / 2

			if (container.isWidget) {
				offsetLeft += entry.absolute.width / 2

				this.centeredToolbar.classList.toggle(this.css.toolbarHidden, !this.isElementVisible(entry.absolute))
				this.setPosition(this.centeredToolbar, offsetLeft, offsetTop)
				this.centeredToolbar.toggleAttribute('data-flip', offsetTop < 0)
			} else {
				const selection = document.getSelection()

				if (selection.rangeCount > 0) {
					const range = selection.getRangeAt(0)
					const rect = range.getBoundingClientRect()

					offsetTop = rect.top - this.centeredToolbar.offsetHeight
					offsetLeft = rect.left - this.centeredToolbar.offsetWidth / 2 + rect.width / 2

					this.centeredToolbar.classList.toggle(this.css.toolbarHidden, !this.isElementVisible(rect))

					if (offsetTop < 0) {
						offsetTop = rect.bottom + this.centeredToolbar.offsetHeight
					}

					this.setPosition(this.centeredToolbar, offsetLeft, offsetTop)
				}
			}
		}
	}

	isElementVisible(elementRect) {
		for (let i = 0; i < this.scrollableParents.length; i++) {
			const container = this.scrollableParents[i]
			const rect = container.getBoundingClientRect()

			if (
				elementRect.top < rect.top ||
				(elementRect.top + Math.min(40, elementRect.bottom - elementRect.top)) > rect.bottom
			) {
				return false
			}
		}

		return true
	}

	setPosition(element, left, top) {
		const maxLeft = Math.min(left, window.innerWidth - this.toolbarIndent - element.offsetWidth)

		element.style.transform = `translate(${Math.max(this.toolbarIndent, maxLeft)}px, ${top}px)`
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
