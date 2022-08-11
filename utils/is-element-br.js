function isElementBr(element) {
	return element.nodeType === 1 && element.nodeName.toLowerCase() === 'br'
}

module.exports = {
	isElementBr
}
