const mapElementToNode = {}

export function setNode(node) {
	mapElementToNode[node.id] = node
}

export function getNodeByElement(element) {
	let currentElement = element

	while (currentElement) {
		if (mapElementToNode[currentElement.nodeId]) {
			return mapElementToNode[currentElement.nodeId]
		}

		currentElement = currentElement.parentNode
	}

	return false
}
