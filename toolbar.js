const getStyle = require('./utils/getStyle')
const getNodeByElement = require('./nodes/node').getNodeByElement
const createElement = require('./create-element')

class Toolbar {
	constructor(plugins, selection) {
		this.onSelectionChange = this.onSelectionChange.bind(this)
		this.controlHandler = this.controlHandler.bind(this)
		this.showTooltip = this.showTooltip.bind(this)
		this.hideTooltip = this.hideTooltip.bind(this)

		this.selection = selection
		this.plugins = plugins
		this.focusedNodes = []

		this.tooltip = createElement('div', {
			'class': 'contenteditor__tooltip hidden'
		})
		this.containerAvatar = createElement('div')
		this.containerAvatar.style.position = 'absolute'
		this.containerAvatar.style.bottom = '0'
		this.containerAvatar.style.right = '0'
		this.containerAvatar.style.border = '1px solid #000'
		// this.containerAvatar.style.left = '-99999%'

		document.body.appendChild(this.containerAvatar)
		document.body.appendChild(this.tooltip)
	}

	onSelectionChange() {
		this.updateTooltip()
	}

	blurFocusedNodes() {
		this.focusedNodes.forEach((node) => {
			if (typeof node.onBlur === 'function') {
				node.onBlur()
			}
		})

		this.focusedNodes = []
	}

	updateTooltip() {
		const anchorElement =
			this.selection.anchorContainer.getChildByOffset(this.selection.anchorOffset)
		const focusElement =
			this.selection.focusContainer.getChildByOffset(this.selection.focusOffset)
		const controls = []
		const focusNode = getNodeByElement(focusElement)
		let anchorNode = getNodeByElement(anchorElement)
		let focusedNodes = this.selection.getArrayRangeItems(anchorNode, focusNode)

		while (anchorNode !== this.selection.anchorContainer.parent) {
			focusedNodes.push(anchorNode)
			anchorNode = anchorNode.parent
		}

		focusedNodes = focusedNodes.filter((node, index, self) => self.indexOf(node) === index)

		if (
			focusedNodes.length !== this.focusedNodes.length ||
			this.selection.isRange ||
			focusedNodes.filter((node, index) => this.focusedNodes[index] !== node).length
		) {
			Object.keys(this.plugins).forEach((type) => {
				if (this.plugins[type].getSelectControls) {
					const nodeControls = this.plugins[type].getSelectControls(focusedNodes)

					if (nodeControls.length) {
						controls.push(nodeControls)
					}
				}
			})

			this.renderControls(controls)
		} else {
			this.renderTooltip()
		}

		this.focusedNodes = focusedNodes
	}

	renderControls(controls = []) {
		// controls — это массив групп кнопок, по отдельным плагинам
		// Если он пустой, то нужно скрыть тултип
		// Если не пустой, то нужно сравнить с тем, что уже отрендерено
		// и новые добавить в тултип, а старые убрать

		if (controls.length) {
			this.emptyTooltip()

			controls.forEach((groupControls) => {
				const group = createElement(
					'div',
					{
						className: 'contenteditor__tooltip-group'
					},
					groupControls.map((control) => control.getElement())
				)

				this.tooltip.appendChild(group)
			})

			this.showTooltip()
		} else {
			this.hideTooltip()
		}
	}

	controlHandler(action, event) {
		action(event, this)
	}

	emptyTooltip() {
		this.tooltip.innerHTML = ''
	}

	showTooltip() {
		this.isShowTooltip = true
		this.tooltip.classList.remove('hidden')
		this.renderTooltip()
	}

	renderTooltip() {
		if (!this.isShowTooltip) {
			return null
		}

		const container = this.selection.anchorContainer
		const scrollTop = document.body.scrollTop || document.documentElement.scrollTop
		const containerBoundingClientRect = container.element.getBoundingClientRect()
		const offsetTop = containerBoundingClientRect.top + scrollTop
		const offsetLeft = containerBoundingClientRect.left
		const styles = getStyle(container.element)

		this.containerAvatar.style.width = container.offsetWidth
		this.containerAvatar.style.fontFamily = styles.fontFamily
		this.containerAvatar.style.fontSize = styles.fontSize
		this.containerAvatar.style.lineHeight = styles.lineHeight
		this.containerAvatar.style.padding = styles.padding
		this.containerAvatar.style.boxSizing = styles.boxSizing
		this.containerAvatar.style.width = styles.width

		const content = container.element.outerText
		const selectedLength = this.selection.focusOffset - this.selection.anchorOffset
		const fakeContent = content.substr(0, this.selection.anchorOffset) +
			'<span data-selected-text>' +
			content.substr(this.selection.anchorOffset, selectedLength) +
			'</span>' +
			content.substr(this.selection.focusOffset)

		this.containerAvatar.innerHTML = fakeContent.replace(/\n/g, '<br />')

		const selectedText = this.containerAvatar.querySelector('span[data-selected-text]')

		this.tooltip.style.top = offsetTop + selectedText.offsetTop - this.tooltip.offsetHeight + 'px'
		this.tooltip.style.left = Math.max(10, offsetLeft +
			selectedText.offsetLeft +
			selectedText.offsetWidth / 2 -
			this.tooltip.offsetWidth / 2) + 'px'
	}

	hideTooltip() {
		this.tooltip.classList.add('hidden')
		this.isShowTooltip = false
		this.containerAvatar.innerHTML = ''
	}
}

module.exports = Toolbar
