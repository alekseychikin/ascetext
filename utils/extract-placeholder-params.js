function extractPlaceholderParams(params) {
	let label = ''
	let className = ''

	if (typeof params === 'undefined') {
		return null
	}

	if (typeof params === 'string') {
		label = params
		className = 'contenteditor__container-placeholder'
	}

	if (typeof params.label === 'string') {
		label = params.label
		className = params.className
	}

	if (typeof params === 'function') {
		return params
	}

	return (element, container) => {
		let root = container

		while (root.parent && root.type !== 'root') {
			root = root.parent
		}

		if (root === container) {
			return false
		}

		const hasOnlyOneChild = root.first === root.last && root.first === container

		if (!hasOnlyOneChild) {
			let current = root.first

			while (current) {
				if (typeof current.hidePlaceholder === 'function') {
					current.hidePlaceholder()
				}

				current = current.next
			}
		}

		element.innerHTML = label
		element.className = className

		return hasOnlyOneChild && container.type === 'paragraph'
	}
}

export default extractPlaceholderParams
