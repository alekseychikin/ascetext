import Fragment from '../nodes/fragment.js'

const containerTags = [ 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div' ]

export default class PluginPlugin {
	get register() {
		return {}
	}

	constructor(params = {}) {
		this.params = params
	}

	create() {
		return new Fragment()
	}

	getClosestContainer(element) {
		let container = element

		while (container) {
			if (containerTags.indexOf(container.nodeName.toLowerCase()) !== -1) {
				return container
			}

			container = container.parentNode
		}
	}

	getFirstTextChild(element) {
		let current = element

		while (current && current.nodeType !== 3) {
			current = current.firstChild
		}

		return current
	}

	getLastTextChild(element) {
		let current = element

		while (current && current.nodeType !== 3) {
			current = current.lastChild
		}

		return current
	}

	getInsertControls() {
		return []
	}

	getReplaceControls() {
		return []
	}

	getSelectControls() {
		return []
	}
}
