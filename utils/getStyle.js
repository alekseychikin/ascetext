module.exports = function getStyle(node) {
	return window.getComputedStyle ? getComputedStyle(node, '') : node.currentStyle
}
