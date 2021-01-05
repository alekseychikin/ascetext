const toolbars = []

function anyToolbarContains(element) {
	let i

	for (i = 0; i < toolbars.length; i++) {
		if (toolbars[i] === element || toolbars[i].contains(element)) {
			return true
		}
	}

	return false
}

class Toolbar {
	constructor(element) {
		this.element = element

		toolbars.push(element)
	}

	destroy() {
		toolbars.splice(toolbars.indexOf(this.element), 1)
	}
}

module.exports = Toolbar
module.exports.anyToolbarContains = anyToolbarContains
