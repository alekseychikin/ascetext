function createElement(tagname, attributes = {}, children = []) {
	let field, dataField
	const element = document.createElement(tagname)

	for (field in attributes) {
		if (Object.prototype.hasOwnProperty.call(attributes, field)) {
			if (field === 'data') {
				for (dataField in attributes[field]) {
					element.setAttribute(`data-${dataField}`, attributes[field][dataField])
				}
			} else if (field === 'style') {
				for (dataField in attributes[field]) {
					element.style[dataField] = attributes[field][dataField]
				}
			} else {
				element.setAttribute(field, attributes[field])
			}
		}
	}

	children.forEach((child) => element.appendChild(child))

	return element
}

export default createElement
