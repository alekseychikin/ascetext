function findElement(node, type) {
	let result = null
	let current
	let i

	for (i = 0; i < node.body.length; i++) {
		current = node.body[i]

		if (current.type === type) {
			return current
		}

		if (result = findElement(current, type)) {
			return result
		}
	}

	return null
}

export default findElement
