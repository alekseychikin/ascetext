import InlineWidget from '../nodes/inline-widget'
import PluginPlugin from './plugin'
import SuggestBar from '../utils/suggest-bar'
import createElement from '../utils/create-element'

const suggests = [{
	id: 1,
	label: 'username'
}, {
	id: 2,
	label: 'userfail'
}, {
	id: 3,
	label: 'usasitizen'
}]

class UserMention extends InlineWidget {
	constructor(params = {}) {
		super('user-mention', params)

		this.setElement(createElement('span', { 'class': 'user-mention' }))
	}
}

export default class UserMentionPlugin extends PluginPlugin {
	constructor(params = {}) {
		super()
		this.params = Object.assign({
			suggestBar: SuggestBar
		}, params)
		this.suggestBar = new this.params.suggestBar()
	}

	create() {
		return new UserMention()
	}

	get autocompleteRule() {
		return /(?:^|(?<=[^\S]))@[a-zA-Z_0-9]+\b/
	}

	parse(element, builder, context) {
		if (element.nodeType === 1 && element.matches('span.user-mention')) {
			const userMention = new UserMention()
			let children

			if (children = builder.parse(element.firstChild, element.lastChild, context)) {
				builder.append(userMention, children)
			}

			return userMention
		}

		return false
	}

	autocomplete(match, selection, boundings) {
		if (!match) {
			return this.suggestBar.hide()
		}

		const username = match.substr(1)
		const items = suggests.filter((suggest) =>
			suggest.label.indexOf(username) === 0
		)

		this.suggestBar.render(items, selection, boundings)
	}

	wrap(match, builder) {
		const userMention = builder.create('userMention')

		builder.preconnect(match, userMention)
		builder.push(userMention, match)

		return userMention
	}

	unwrap(node, builder) {
		if (node.type === 'user-mention') {
			builder.connect(node, node.first)
			builder.cut(node)
		}
	}
}
