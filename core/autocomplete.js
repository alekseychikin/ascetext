export default class Autocomplete {
	constructor(plugins, selection, builder, editing) {
		this.onSelectionChange = this.onSelectionChange.bind(this)

		this.plugins = plugins
		this.selection = selection
		this.builder = builder
		this.editing = editing
		this.patterns = Object.keys(plugins).map((plugin) =>
			plugins[plugin].autocompleteRule ? { plugin, rule: plugins[plugin].autocompleteRule } : null
		).filter(Boolean)
		this.lastAnchorContainer = null
		this.lastAnchorOffset = null
		console.log('this.patterns', this.patterns)

		this.selection.onUpdate(this.onSelectionChange)
	}

	onSelectionChange(selection) {
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
				console.log('match', match[0])
				start += match.index
				itemContent = itemContent.substr(match.index + match[0].length)

				if (start <= selection.anchorOffset && start + match[0].length >= selection.anchorOffset) {
					this.editing.update()
					plugin = this.plugins[this.patterns[index].plugin]

					// debugger
					const textNode = this.builder.create('text', {}, match[0])

					plugin.unwrap(selection.anchorContainer.getChildByOffset(start).node, this.builder)

					const { head, tail } = selection.cutRange(selection.anchorContainer, start, selection.anchorContainer, start + match[0].length)
					const selectedItems = selection.getArrayRangeItems(head, tail)
					const { since, until } = this.editing.captureSinceAndUntil(selectedItems, 0)
					const node = plugin.wrap(textNode, this.builder)

					this.builder.replaceUntil(since, node, until)
					selection.setSelection(selection.anchorContainer, selection.anchorOffset)
					// this.plugins[this.patterns[index].plugin].autocomplete(match[0], selection, this.getRangeOffsets(selection, start, start + match[0].length))

					return
				}

				start += match[0].length
			}
		}

		for (index = 0; index < this.patterns.length; index++) {
			// this.plugins[this.patterns[index].plugin].autocomplete(null)
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
