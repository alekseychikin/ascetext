import InlineWidget from '../nodes/inline-widget'
import PluginPlugin from './plugin'
import SuggestBar from '../utils/suggest-bar'
import createElement from '../utils/create-element'
import isHtmlElement from '../utils/is-html-element'

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

		this.setElement(createElement('mark', { 'class': 'user-mention' }))
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
		if (isHtmlElement(element) && element.matches('mark.user-mention')) {
			const userMention = new UserMention()
			let children

			if (children = builder.parse(element, context)) {
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
		let current = node

		while (current) {
			if (current.type === 'user-mention') {
				builder.connect(current, current.first)
				builder.cut(current)

				return
			}

			current = current.parent
		}
	}
}
