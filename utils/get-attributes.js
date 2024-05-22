export default function getAttributes(element) {
	const attributes = {}
	let i

	for (i = 0; i < element.attributes.length; i++) {
		attributes[element.attributes[i].nodeName.toLowerCase()] = element.attributes[i].nodeValue
	}

	return attributes
}
