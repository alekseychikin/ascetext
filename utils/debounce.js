function debounce(handler, timeout) {
	let timer

	return function (...params) {
		clearTimeout(timer)
		timer = setTimeout(() => {
			handler(...params)
		}, timeout)
	}
}

export default debounce
