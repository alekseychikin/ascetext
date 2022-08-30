function getStyle(node) {
	return window.getComputedStyle ? getComputedStyle(node, '') : node.currentStyle
}

export default getStyle
