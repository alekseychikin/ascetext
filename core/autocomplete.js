export default class Autocomplete {
	constructor(core) {
		this.onEdit = this.onEdit.bind(this)

		this.node = core.node
		this.plugins = core.plugins
		this.selection = core.selection
		this.builder = core.builder
		this.editing = core.editing
		this.patterns = Object.keys(this.plugins).map((plugin) =>
			this.plugins[plugin].autocompleteRule ? { plugin, rule: this.plugins[plugin].autocompleteRule } : null
		).filter(Boolean)
		this.lastAnchorContainer = null
		this.lastAnchorOffset = null

		this.selection.onUpdate(this.onEdit)
	}

	onEdit() {
		const { selection, editing } = this

		if (
			!selection.focused ||
			selection.isRange ||
			this.lastAnchorContainer === selection.anchorContainer && this.lastAnchorOffset === selection.anchorOffset
		) {
			return
		}

		const content = selection.anchorContainer.element.outerText
		let itemContent
		let start
		let index
		let match
		let plugin

		this.lastAnchorContainer = selection.anchorContainer
		this.lastAnchorOffset = selection.anchorOffset

		for (index = 0; index < this.patterns.length; index++) {
			start = 0
			itemContent = content

			while (match = itemContent.match(this.patterns[index].rule)) {
				start += match.index
				itemContent = itemContent.substr(match.index + match[0].length)

				if (start <= selection.anchorOffset && start + match[0].length >= selection.anchorOffset - 1) {
					editing.update()
					plugin = this.plugins[this.patterns[index].plugin]
					plugin.unwrap(selection.anchorContainer.getChildByOffset(start + 1).node, this.builder)

					const textNode = this.builder.create('text', {}, match[0])
					const { head, tail } = selection.cutRange(selection.anchorContainer, start, selection.anchorContainer, start + match[0].length)
					const selectedItems = selection.getArrayRangeItems(head, tail)
					const { since, until } = editing.captureSinceAndUntil(selectedItems, 0)
					const node = plugin.wrap(textNode, this.builder)

					this.builder.replaceUntil(since, node, until)
					selection.setSelection(selection.anchorContainer, selection.anchorOffset)

					return
				}

				start += match[0].length
			}
		}
	}

	getRangeOffsets(selection, start, finish) {
		const content = selection.anchorContainer.element.outerText
		const fakeContent = content.substr(0, start) +
			'<span style="background: blue" data-selected-text>' +
			content.substr(start, finish - start) +
			'</span>' +
			content.substr(finish)
		selection.containerAvatar.innerHTML = fakeContent.replace(/\n/g, '<br />')
		const selectedText = selection.containerAvatar.querySelector('span[data-selected-text]')

		return {
			left: selection.boundings.container.left + selectedText.offsetLeft,
			top: selection.boundings.container.top + selectedText.offsetTop,
			width: selectedText.offsetWidth,
			height: selectedText.offsetHeight
		}
	}
}
