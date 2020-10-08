export const mapElementToNode = []

export function getNodeByElement(element) {
	let currentElement = element
	let i

	while (currentElement) {
		for (i = 0; i < mapElementToNode.length; i++) {
			if (mapElementToNode[i].element === currentElement) {
				return mapElementToNode[i]
			}
		}

		currentElement = currentElement.parentNode
	}
}

export default class Node {
	fields = []

	constructor(type) {
		this.type = type
		this.isContainer = false
		this.isWidget = false
		this.isSection = false
		this.isGroup = false
		this.isDeleteEmpty = false

		mapElementToNode.push(this)
	}

	setElement(element) {
		this.element = element
	}

	append(node) {
		let current = node

		if (node.previous) {
			if (node.parent) {
				node.parent.last = node.previous
			}

			delete node.previous.next
			delete node.previous
		}

		if (!this.first) {
			this.first = node
		} else {
			this.last.next = node
			node.previous = this.last
		}

		if (node.parent && node.parent.first === node) {
			delete node.parent.first
			delete node.parent.last
		}

		if (
			this.isContainer &&
			this.first &&
			this.first === this.last &&
			this.first.type === 'breakLine'
		) {
			this.first.delete()
		}

		while (current) {
			current.parent = this
			this.last = current

			this.element.appendChild(current.element)
			current = current.next
		}

		this.emitOnUpdate()
	}

	push(node) {
		if (node.previous) {
			if (node.next) {
				node.previous.next = node.next
				node.next.previous = node.previous
			} else {
				if (node.parent) {
					node.parent.last = node.previous
				}

				delete node.previous.next
			}
		} else if (node.next) {
			delete node.next.previous

			if (node.parent) {
				node.parent.first = node.next
			}
		} else if (node.parent) {
			delete node.parent.first
			delete node.parent.last
		}

		if (this.last) {
			this.last.next = node
			node.previous = this.last
		} else {
			delete node.previous
			this.first = node
		}

		delete node.next
		this.last = node
		node.parent = this

		if (
			this.isContainer &&
			this.first &&
			this.first === this.last &&
			this.first.type === 'breakLine'
		) {
			this.first.delete()
		}

		this.element.appendChild(node.element)
		this.emitOnUpdate()
	}

	preconnect(node) {
		let last = node

		if (node.previous) {
			if (node.parent) {
				node.parent.last = node.previous
			}

			delete node.previous.next
		} else if (node.parent) {
			delete node.parent.first
			delete node.parent.last
		}

		do {
			if (this.parent) {
				last.parent = this.parent
				this.parent.element.insertBefore(last.element, this.element)
			}

			if (!last.next) {
				break
			}

			last = last.next
		} while (true) // eslint-disable-line no-constant-condition

		if (this.previous) {
			this.previous.next = node
			node.previous = this.previous
		} else if (this.parent) {
			this.parent.first = node
		}

		last.next = this
		this.previous = last
		this.emitOnUpdate()
	}

	connect(node) {
		let last = node

		if (node.previous) {
			if (node.parent) {
				node.parent.last = node.previous
			}

			delete node.previous.next
		} else if (node.parent) {
			delete node.parent.first
			delete node.parent.last
		}

		if (this.parent) {
			node.parent = this.parent
		}

		do {
			if (this.parent) {
				last.parent = this.parent

				if (this.next) {
					this.parent.element.insertBefore(last.element, this.next.element)
				} else {
					this.parent.element.appendChild(last.element)
				}
			}

			if (!last.next) {
				break
			}

			last = last.next
		} while (true) // eslint-disable-line no-constant-condition

		if (this.next) {
			this.next.previous = last
			last.next = this.next
		} else if (this.parent) {
			this.parent.last = last
		}

		this.next = node
		node.previous = this
		this.emitOnUpdate()
	}

	delete() {
		const parent = this.parent
		let current = this.first
		let next

		if (this.isDeleted) {
			return
		}

		this.isDeleted = true

		while (current) {
			next = current.next
			current.delete()
			current = next
		}

		if (this.previous) {
			if (this.next) {
				this.previous.next = this.next
				this.next.previous = this.previous
			} else {
				delete this.previous.next

				if (this.parent) {
					this.parent.last = this.previous
				}
			}
		} else if (this.next) {
			delete this.next.previous

			if (this.parent) {
				this.parent.first = this.next
			}
		} else if (this.parent) {
			delete this.parent.first
			delete this.parent.last
		}

		if (this.element && this.element.parentNode) {
			this.element.parentNode.removeChild(this.element)
		}

		mapElementToNode.splice(mapElementToNode.indexOf(this), 1)

		if (this.parent && this.parent.isDeleteEmpty && !this.parent.first) {
			this.parent.delete()
		}

		delete this.element
		delete this.parent
		delete this.previous
		delete this.next

		if (this.onDelete) {
			this.onDelete()
		}

		if (parent) {
			parent.emitOnUpdate()
		}
	}

	replaceWith(newNode, replaceUntil) {
		let node = this
		let next

		if (this.previous) {
			this.previous.connect(newNode)
		} else {
			this.preconnect(newNode)
		}

		while (node) {
			if (node === replaceUntil) {
				break
			}

			next = node.next
			node.delete()
			node = next
		}

		if (this.onReplace) {
			this.onReplace(newNode)
		}
	}

	clearChildren(first) {
		let current = first
		let next

		while (current) {
			next = current.next
			current.delete()
			current = next
		}

		if (
			!this.isContainer || !(
				this.element.firstChild &&
				this.element.firstChild === this.element.lastChild &&
				this.element.firstChild.nodeType === 1 &&
				this.element.firstChild.tagName.toLowerCase() === 'br'
			)
		) {
			while (this.element.childNodes.length) {
				this.element.removeChild(this.element.childNodes[0])
			}
		}
	}

	getClosestContainer() {
		let container = this

		while (!container.isContainer && !container.isWidget) {
			container = container.parent
		}

		return container
	}

	get firstChild() {
		return this.element.firstChild
	}

	get lastChild() {
		return this.element.lastChild
	}

	findFirstContainerNode() {
		let current = this

		while (current && !current.isContainer) {
			current = current.first
		}

		return current
	}

	findFirstTextElement() {
		let element = this.element

		while (element && element && element.nodeType !== 3) {
			element = element.firstChild
		}

		return element
	}

	findLastTextElement() {
		let element = this.element

		while (element && element.nodeType !== 3) {
			element = element.lastChild
		}

		return element
	}

	getPreviousSelectableNode() {
		let current = this

		while (current) {
			if (current.previous) {
				current = current.previous

				while (current.last) {
					current = current.last
				}
			} else {
				current = current.parent

				if (!current) {
					return false
				}

				if (current.contains(this)) {
					continue
				}
			}

			if (
				(current.parent.isSection || current.parent.isGroup) &&
				(current.isContainer || current.isWidget)
			) {
				return current
			}
		}
	}

	getNextSelectableNode() {
		let current = this

		while (current) {
			if (current.next) {
				current = current.next

				while (current.first) {
					current = current.first
				}
			} else {
				current = current.parent

				if (!current) {
					return false
				}

				if (current.contains(this)) {
					continue
				}
			}

			if (
				(current.parent.isSection || current.parent.isGroup) &&
				(current.isContainer || current.isWidget)
			) {
				return current
			}
		}
	}

	getOffset(element) {
		const [ offset ] = this.calcOffset(this.element, element)

		return offset
	}

	calcOffset(container, element) {
		let offset = 0
		let i

		for (i = 0; i < container.childNodes.length; i++) {
			if (container.childNodes[i] === element) {
				return [ offset, true ]
			}

			if (container.childNodes[i].nodeType === 3) {
				offset += container.childNodes[i].length
			} else if (
				container.childNodes[i].nodeType === 1 &&
				container.childNodes[i].tagName.toLowerCase() === 'br' &&
				container.lastChild !== container.childNodes[i]
			) {
				offset += 1
			} else if (container.childNodes[i].childNodes) {
				const [ subOffset, returnOffset ] = this.calcOffset(container.childNodes[i], element)

				offset += subOffset

				if (returnOffset) {
					return [ offset, true ]
				}
			}
		}

		return [ offset, false ]
	}

	getChildByOffset(offset, container = this.element) {
		let restOffset = offset
		let i

		for (i = 0; i < container.childNodes.length; i++) {
			if (container.childNodes[i].nodeType === 3) {
				if (container.childNodes[i].length >= restOffset) {
					return [ container.childNodes[i], restOffset ]
				} else {
					restOffset -= container.childNodes[i].length
				}
			} else if (
				container.childNodes[i].nodeType === 1 &&
				container.childNodes[i].tagName.toLowerCase() === 'br'
			) {
				if (restOffset === 0) {
					return [ container.childNodes[i], restOffset ]
				} else {
					restOffset -= 1
				}
			} else if (container.childNodes[i].childNodes) {
				const [ subChild, subRestOffset ] = this.getChildByOffset(restOffset, container.childNodes[i])

				if (subChild) {
					return [ subChild, subRestOffset ]
				} else {
					restOffset = subRestOffset
				}
			}
		}

		return [ void 0, restOffset ]
	}

	getLastNode() {
		let current = this

		while (current.next) {
			current = current.next
		}

		return current
	}

	duplicate() {
		throw new Error(`Plugin ${this.__proto__.constructor.name} must implement method duplicate`)
	}

	split(position) {
		const container = this.getClosestContainer()
		const [ selectedChild ] = this.getChildByOffset(position)
		let nodeChild = getNodeByElement(selectedChild)

		while (nodeChild.parent !== this) {
			nodeChild = nodeChild.parent
		}

		const nodeChildPosition = position - this.getOffset(nodeChild.element)
		const tail = nodeChild.split(nodeChildPosition)

		if (tail) {
			const duplicate = this.duplicate()

			duplicate.append(tail)
			container.isChanged = true

			return duplicate
		} else if (nodeChildPosition > 0 && nodeChild.next) {
			const duplicate = this.duplicate()

			duplicate.append(nodeChild.next)
			container.isChanged = true

			return duplicate
		}

		return false
	}

	contains(childNode) {
		let current = childNode

		while (current) {
			if (current === this) {
				return true
			}

			if (current.parent) {
				current = current.parent
			} else {
				return false
			}
		}

		return false
	}

	stringify() {
		return ''
	}

	emitOnUpdate() {
		let current = this

		while (current.parent) {
			current = current.parent
		}

		if (current.onUpdate) {
			current.onUpdate()
		}
	}
}
