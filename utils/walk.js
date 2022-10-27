export default function walk(rootElement, callback) {
	let returnValue
	let current = rootElement.firstChild

	while (current && current !== rootElement) {
		returnValue = callback(current)

		if (typeof returnValue !== 'undefined') {
			return returnValue
		}

		if (current.firstChild) {
			current = current.firstChild

			continue
		}

		if (current.nextSibling) {
			current = current.nextSibling

			continue
		}

		if (current.parentNode) {
			current = current.parentNode

			while (current && current !== rootElement) {
				if (current.nextSibling) {
					current = current.nextSibling

					break
				}

				current = current.parentNode
			}
		}
	}
}
