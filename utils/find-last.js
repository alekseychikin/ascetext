function findLastNode(node, iterator) {
	let last = node

	while (last.next && iterator(last.next)) {
		last = last.next
	}
	
	return last
}

export default findLastNode
