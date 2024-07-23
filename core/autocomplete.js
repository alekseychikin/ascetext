export default class Autocomplete {
	constructor(core) {
		this.node = core.node
		this.plugins = core.plugins
		this.selection = core.selection
		this.builder = core.builder
		this.patterns = this.plugins.map((plugin) =>
			plugin.autocompleteRule ? { plugin, rule: plugin.autocompleteRule } : null
		).filter(Boolean)
	}

	trigger() {
		const { selection, builder } = this

		if (selection.isRange) {
			return
		}

		const content = this.getContent()
		let index
		let match

		for (index = 0; index < this.patterns.length; index++) {
			if (match = content.match(this.patterns[index].rule)) {
				const { head, tail } = selection.cutRange(selection.anchorContainer, selection.anchorOffset - match[0].length, selection.anchorContainer, selection.anchorOffset)
				const plugin = this.patterns[index].plugin
				const anchor = tail.next

				builder.cutUntil(head, tail)

				const node = plugin.wrap(tail, builder, selection)

				builder.append(selection.anchorContainer, node, anchor)

				return true
			}
		}

		return false
	}

	getContent() {
		let current = this.selection.getNodeByOffset(this.selection.anchorContainer, this.selection.anchorOffset)
		let offset = 0
		let content = ''

		if (current.parent.isInlineWidget) {
			return ''
		}

		while (current && current.type === 'text') {
			content = (current.type === 'text' ? current.attributes.content : '\n') + content
			offset = this.builder.getOffsetToParent(this.selection.anchorContainer, current)
			current = current.previous
		}

		return content.substring(0, this.selection.anchorOffset - offset)
	}
}
