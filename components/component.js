export default class ComponentComponent {
	register(core) {
		this.core = core
	}

	catchShortcut() {
		return false
	}

	unregister() {
		this.core = null
	}

	checkSelection() {
		return false
	}
}
