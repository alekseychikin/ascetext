export default function createElement(tagname, attributes = {}, children = []) {
	let field, dataField
	const element = document.createElement(tagname)

	for (field in attributes) {
		if (attributes.hasOwnProperty(field)) {
			if (field === 'data') {
				for (dataField in attributes[field]) {
					element.setAttribute(`data-${dataField}`, attributes[field][dataField])
				}
			} else {
				element.setAttribute(field, attributes[field])
			}
		}
	}

	children.forEach((child) => element.appendChild(child))

	return element
}
