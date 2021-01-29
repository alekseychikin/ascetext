const containerTags = [ 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div' ]

class PluginPlugin {
	constructor() {
		this.core = null
	}

	setCore(core) {
		this.core = core
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
}

module.exports = PluginPlugin
