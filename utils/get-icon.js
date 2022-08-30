export default function getIcon(iconSource) {
	if (iconSource.toLowerCase().indexOf('<svg') !== -1) {
		const container = document.createElement('div')

		container.innerHTML = iconSource

		return container.firstChild
	}

	const img = document.createElement('img')

	img.src = iconSource

	return img
}
