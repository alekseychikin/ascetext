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

export function hasRoot(node) {
	return findParent(node, (item) => item.type === 'root')
}

export default findParent
