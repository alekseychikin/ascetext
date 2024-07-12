export default class Autocomplete {
	constructor(core) {
		this.node = core.node
		this.plugins = core.plugins
		this.selection = core.selection
		this.builder = core.builder
		this.editing = core.editing
		this.patterns = this.plugins.map((plugin) =>
			plugin.autocompleteRule ? { plugin, rule: plugin.autocompleteRule } : null
		).filter(Boolean)
	}

	trigger() {
		const { selection, editing, builder } = this

		if (selection.isRange) {
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
			console.log(this.patterns[index].rule)
			start = 0
			// itemContent = content

			// while (match = itemContent.match(this.patterns[index].rule)) {
			// 	start += match.index
			// 	itemContent = itemContent.substr(match.index + match[0].length)

			// 	if (start <= selection.anchorOffset && start + match[0].length >= selection.anchorOffset - 1) {
			// 		editing.update()
			// 		plugin = this.patterns[index].plugin

			// 		const textNode = builder.create('text', { content: match[0] })
			// 		const { head, tail } = selection.cutRange(selection.anchorContainer, start, selection.anchorContainer, start + match[0].length)
			// 		const selectedItems = selection.getArrayRangeItems(head, tail)
			// 		const { since, until } = editing.captureSinceAndUntil(selectedItems, 0)
			// 		const node = plugin.wrap(textNode, builder)

			// 		builder.replaceUntil(since, node, until)
			// 		selection.setSelection(selection.anchorContainer, selection.anchorOffset)

			// 		return
			// 	}

			// 	start += match[0].length
			// }
		}
	}
}
