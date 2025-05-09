export default class Autocomplete {
	constructor(core) {
		this.node = core.node
		this.plugins = core.plugins
		this.selection = core.selection
		this.builder = core.builder
		this.editing = core.editing
		this.timeTravel = core.timeTravel
		this.parser = core.parser
		this.patterns = this.plugins.map((plugin) =>
			plugin.autocompleteRule
				? { plugin, rule: plugin.autocompleteRule, trigger: plugin.autocompleteTrigger }
				: null
		).filter(Boolean)
	}

	trigger(key) {
		const { selection } = this
		let index
		let content

		if (selection.isRange) {
			return false
		}

		for (index = 0; index < this.patterns.length; index++) {
			if (key.match(this.patterns[index].trigger)) {
				if (!content) {
					content = this.getContent()
				}

				if (this.run(content, this.patterns[index])) {
					return true
				}
			}
		}

		return false
	}

	runAll() {
		const content = this.getContent()
		let index

		for (index = 0; index < this.patterns.length; index++) {
			if (this.run(content, this.patterns[index])) {
				return true
			}
		}

		return false
	}

	run(content, pattern) {
		const { selection, builder, timeTravel, editing } = this
		let match

		if (match = content.match(pattern.rule)) {
			editing.syncContainer(selection.anchorContainer)
			timeTravel.commit()
			timeTravel.preservePreviousSelection()

			if (pattern.plugin.autocomplete) {
				pattern.plugin.autocomplete(match, builder, selection, this.editing)
				builder.commit()
			} else {
				console.error(pattern.plugin, 'does not have autocomplete')
			}

			return true
		}

		return false
	}

	getContent() {
		const { builder, selection, parser } = this

		selection.selectionChange()

		const relevant = builder.parseVirtualTree(parser.getVirtualTree(selection.anchorContainer.element.firstChild))
		let current = builder.getNodeByOffset(relevant, selection.anchorOffset)
		let offset = 0
		let content = ''

		while (current && current.type === 'text') {
			content = (current.type === 'text' ? current.attributes.content : '\n') + content
			offset = builder.getOffsetToParent(relevant, current)
			current = current.previous
		}

		return content.substring(0, selection.anchorOffset - offset)
	}
}
