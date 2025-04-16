import Fragment from '../nodes/fragment.js'

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
