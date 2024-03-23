function findParent(node, handler) {
	let parent = node

	while (parent) {
		if (handler(parent)) {
			return parent
		}

		parent = parent.parent
	}

	return false
}

export default findParent
