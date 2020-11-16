class Toolbar {
	constructor(core) {
		this.toggleControls = this.toggleControls.bind(this)
		this.hideToolbar = this.hideToolbar.bind(this)
		this.showToolbar = this.showToolbar.bind(this)
		this.controlHandler = this.controlHandler.bind(this)

		this.core = core
		this.isShowToolbar = false
		this.isShowControls = false
		this.createControls()
	}

	toggleControls() {
		if (this.isShowControls) {
			this.toolbar.classList.remove('show-controls')
			this.controls.classList.add('hidden')
		} else {
			this.toolbar.classList.add('show-controls')
			this.controls.classList.remove('hidden')
		}

		this.isShowControls = !this.isShowControls
	}

	hideToolbar() {
		if (this.isShowToolbar) {
			this.toolbar.classList.remove('show-controls')
			this.toolbar.classList.add('hidden')
			this.controls.classList.add('hidden')
			this.isShowToolbar = false
			this.isShowControls = false
		}
	}

	showToolbar() {
		const container = this.core.selection.selectedContainers[0]
		const containerBoundingClientRect = container.element.getBoundingClientRect()
		let controls = []
		const scrollTop = document.body.scrollTop || document.documentElement.scrollTop

		this.controls.innerHTML = ''

		Object.keys(this.core.plugins).forEach((pluginName) => {
			if (this.core.plugins[pluginName].getInsertControls) {
				controls = controls.concat(this.core.plugins[pluginName].getInsertControls(container))
			}
		})

		controls.forEach((control) => {
			control.setEventListener(this.controlHandler)
			this.controls.appendChild(control.getElement())
		})

		if (controls.length) {
			this.toolbar.classList.remove('hidden')
			this.isShowToolbar = true
			this.toolbar.style.top = containerBoundingClientRect.top + scrollTop + 'px'
			this.toolbar.style.left = containerBoundingClientRect.left + 'px'
		} else {
			this.toolbar.classList.add('hidden')
			this.isShowToolbar = false
		}
	}

	controlHandler(action, event) {
		const container = this.core.selection.selectedContainers[0]

		Promise.resolve()
			.then(() => action(container, event))
			.then((replacedContainer) => {
				this.hideToolbar()
				this.core.update(replacedContainer, replacedContainer)

				if (replacedContainer.isWidget) {
					this.core.setPosition(replacedContainer.element, 0)
					replacedContainer.element.focus()
				} else {
					const text = replacedContainer.findFirstTextElement()
					const firstContainer = replacedContainer.findFirstContainerNode()

					this.core.setPosition(text || firstContainer.element, 0)
				}
			})
	}

	update() {
		if (!this.core.selection.focused) {
			this.hideToolbar()

			return false
		}

		const isContainer = this.core.selection.anchorNode.isContainer
		const sameNode = this.core.selection.anchorNode === this.core.selection.focusNode
		const emptyElement =
			this.core.selection.anchorAtFirstPositionInContainer && this.core.selection.anchorAtLastPositionInContainer

		if (!this.core.selection.isRange && sameNode && emptyElement && isContainer) {
			this.showToolbar()
		} else {
			this.hideToolbar()
		}
	}

	createControls() {
		this.toolbar = document.createElement('div')
		this.toolbar.className = 'rich-editor__toolbar hidden'
		this.controls = document.createElement('div')
		this.controls.className = 'rich-editor__controls right hidden'
		this.controlsToggler = document.createElement('button')
		this.controlsToggler.type = 'button'
		this.controlsToggler.className = 'rich-editor__toolbar-toggler'

		this.toolbar.appendChild(this.controlsToggler)
		this.toolbar.appendChild(this.controls)
		document.body.appendChild(this.toolbar)
		this.controlsToggler.addEventListener('click', this.toggleControls)
	}
}

module.exports = Toolbar
