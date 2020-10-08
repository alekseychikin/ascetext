class Layout {
	constructor() {
		this.mapElementToNode = []
	}

	setNode(node) {
		const index = this.findIndexPreviousElement(node)

		this.mapElementToNode.splice(index + 1, 0, node)
	}

	removeNode(node) {
		const index = this.mapElementToNode.indexOf(node)
		let current = node.first

		if (index > -1) {
			this.mapElementToNode.splice(index, 1)

			while (current) {
				this.removeNode(current)

				current = current.next
			}
		}
	}

	getIndexByElement(element) {
		let elementIndex = -1

		if (element) {
			this.mapElementToNode.forEach((item, index) => {
				if (item.element === element) {
					elementIndex = index
				}
			})

			if (elementIndex === -1) {
				return this.getIndexByElement(element.parentNode)
			}
		}

		return elementIndex
	}

	getIndexByNode(node) {
		return this.mapElementToNode.indexOf(node)
	}

	getNodeByIndex(index) {
		return this.mapElementToNode[index]
	}

	getNodeByElement(element) {
		let currentElement = element
		let i

		while (currentElement) {
			for (i = 0; i < this.mapElementToNode.length; i++) {
				if (this.mapElementToNode[i].element === currentElement) {
					return this.mapElementToNode[i]
				}
			}

			currentElement = currentElement.parentNode
		}
	}

	isExistsNodeByElement(element) {
		let i

		for (i = 0; i < this.mapElementToNode.length; i++) {
			if (this.mapElementToNode[i].element === element) {
				return true
			}
		}

		return false
	}

	index(firstNode, lastNode) {
		const index = this.findIndexPreviousElement(firstNode)
		let length = this.findIndexNextElement(lastNode)
		const subMapElementToNode = this.parseIndex(firstNode, lastNode)

		if (length > -1) {
			length -= index + 1
		} else {
			length = this.mapElementToNode.length - index - 1
		}

		if (index > 0) {
			Array.prototype.splice.apply(this.mapElementToNode, [ index + 1, length, ...subMapElementToNode ])
		} else {
			this.mapElementToNode = this.mapElementToNode.concat(subMapElementToNode)
		}
	}

	parseIndex(firstNode, lastNode) {
		let result = []
		let current = firstNode

		while (current) {
			result.push(current)

			if (current.first) {
				result = result.concat(this.parseIndex(current.first, lastNode))
			}

			if (current === lastNode) {
				return result
			}

			current = current.next
		}

		return result
	}

	getLastNode(node) {
		let current = node

		while (current.last) {
			current = current.last
		}

		return current
	}

	slice(start, end) {
		return this.mapElementToNode.slice(start, end)
	}

	previous(node) {
		const index = this.mapElementToNode.indexOf(node)

		return this.mapElementToNode[index - 1]
	}

	get last() {
		if (this.mapElementToNode.length > 1) {
			return this.mapElementToNode[this.mapElementToNode.length - 1]
		}

		return this.mapElementToNode[0]
	}

	findIndexNextElement(element) {
		let current = element.next
		let index

		if (current) {
			index = this.mapElementToNode.indexOf(current)

			if (index > -1) {
				return index
			}

			current = current.next
		}

		if (element.parent && element.parent.next) {
			return this.mapElementToNode.indexOf(element.parent.next)
		}

		return -1
	}

	findIndexPreviousElement(node) {
		let current = node
		let index

		while (current) {
			while (current.previous) {
				current = current.previous

				index = this.findNestedIndexPreviousElement(current)

				if (index > -1) {
					return index
				}
			}

			current = current.parent
			index = this.mapElementToNode.indexOf(current)

			if (index > -1) {
				return index
			}
		}

		return -1
	}

	findNestedIndexPreviousElement(node) {
		let index = -1
		let current = node

		if (node.last) {
			index = this.findNestedIndexPreviousElement(node.last)

			if (index > -1) {
				return index
			}
		}

		index = this.mapElementToNode.indexOf(node)

		if (index > -1) {
			return index
		}

		while (current.previous) {
			current = current.previous
			index = this.findNestedIndexPreviousElement(current)

			if (index > -1) {
				return index
			}
		}

		return index
	}

	getPreviousSelectableNode(node) {
		let index

		for (index = this.mapElementToNode.indexOf(node) - 1; index > -1; index--) {
			if (this.mapElementToNode[index].isContainer || this.mapElementToNode[index].isWidget) {
				return this.mapElementToNode[index]
			}
		}

		return null
	}

	getNextSelectableNode(node) {
		let index

		for (index = this.mapElementToNode.indexOf(node) + 1; index < this.mapElementToNode.length; index++) {
			if (this.mapElementToNode[index].isContainer || this.mapElementToNode[index].isWidget) {
				return this.mapElementToNode[index]
			}
		}

		return null
	}
}

export default new Layout()
