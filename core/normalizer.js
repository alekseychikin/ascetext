import Publisher from './publisher.js'
import { operationTypes } from './builder.js'
import isFunction from '../utils/is-function.js'
import { hasRoot } from '../utils/find-parent.js'

export default class Normalizer extends Publisher {
	constructor(core) {
		super()

		this.normalizeHandle = this.normalizeHandle.bind(this)
		this.onChange = this.onChange.bind(this)

		this.core = core
		this.unnormalizedNodes = []
		this.timer = null
		this.core.builder.subscribe(this.onChange)
	}

	onChange(event) {
		if (!this.core.model.contains(event.target)) {
			return
		}

		switch (event.type) {
			case operationTypes.APPEND:
				this.pushNode(event.last)
				this.pushNode(event.last.next)

				break
			case operationTypes.CUT:
				this.pushNode(event.last.next)
				this.pushNode(event.previous)

				break
			case operationTypes.ATTRIBUTE:
				this.pushNode(event.target)
				this.pushNode(event.target.next)

				break
		}
	}

	pushNode(node) {
		if (!node) {
			return
		}

		if (!this.unnormalizedNodes.includes(node)) {
			this.unnormalizedNodes.push(node)
		}

		clearTimeout(this.timer)
		this.timer = setTimeout(this.normalizeHandle, 0)
	}

	normalizeHandle() {
		clearTimeout(this.timer)

		if (this.unnormalizedNodes.length) {
			this.normalize(this.unnormalizedNodes)
		}
	}

	normalize(nodes) {
		let limit = 1000
		let node
		let next
		let current

		while (node = nodes.pop()) {
			if (hasRoot(node)) {
				current = node

				while (current && limit-- > 0) {
					if (next = this.normalizeWalkUp(current)) {
						current = next

						continue
					}

					if (next = this.normalizeWalkDown(current)) {
						current = next

						continue
					}

					break
				}
			}
		}

		this.sendMessage()
	}

	normalizeWalkUp(node) {
		let current = node
		let next

		while (current && current.type !== 'root') {
			current = current.deepesetLastNode()

			while (current.previous) {
				if (next = this.normalizeEmpty(node, current)) {
					return next
				}

				if (next = this.normalizeJoin(node, current)) {
					return next
				}

				current = current.previous
			}

			if (next = this.normalizeEmpty(node, current)) {
				return next
			}

			while (!current.previous) {
				current = current.parent

				if (current.type === 'root') {
					break
				}

				if (next = this.normalizeJoin(node, current)) {
					return next
				}

				if (next = this.normalizeEmpty(node, current)) {
					return next
				}
			}

			current = current.previous
		}

		return false
	}

	normalizeWalkDown(node) {
		let current = node
		let next

		while (current && current.type !== 'root') {
			current = current.deepesetFirstNode()

			while (current.next) {
				if (current.first) {
					current = current.deepesetFirstNode()
					break
				}

				if (next = this.normalizeAccept(node, current)) {
					return next
				}

				current = current.next
			}

			if (next = this.normalizeAccept(node, current)) {
				return next
			}

			while (!current.next) {
				current = current.parent

				if (current.type === 'root') {
					break
				}

				if (next = this.normalizeAccept(node, current)) {
					return next
				}
			}

			current = current.next
		}

		return false
	}

	normalizeEmpty(node, current) {
		if (current.canDelete()) {
			const next = current.previous || current.parent

			this.core.builder.cut(current)

			if (node !== current) {
				return node
			}

			return next
		}

		if (current.isContainer && current.isEmpty && !current.first) {
			this.core.builder.append(current, this.core.builder.create('text', { content: '' }))
		}

		return false
	}

	normalizeAccept(node, current) {
		// console.log('normalizeAccept', current.parent, current)
		if (!current.parent.accept(current) || !current.fit(current.parent)) {
			// надо проверить, что вообще возможно поместить этот current хоть во что-то из родителей
			// если нет, то нужно попробовать поместить дочерние элементы
			let next = current.parent.next
			let parent = current.parent

			if (current.next) {
				const duplicated = current.parent.split(this.core.builder, current.next)

				// this.append(current.parent.parent, duplicated, current.parent.next)
				next = duplicated.tail
				parent = duplicated.head
			}

			this.core.builder.append(parent.parent, current, next)

			return node
		}

		return false
	}

	normalizeJoin(node, current) {
		let joined

		if (joined = this.join(current)) {
			if (current === node) {
				return joined
			}

			return node
		}

		return false
	}

	join(node) {
		const previous = node.previous
		let joined

		if (previous && isFunction(previous.join) && (joined = previous.join(node, this.core.builder))) {
			this.core.builder.append(joined, previous.first)
			this.core.builder.append(joined, node.first)
			this.core.builder.replaceUntil(previous, joined, node)

			return joined
		}

		return null
	}

	canAccept(container, current) {
		if (container.accept(current) && current.fit(container)) {
			return container
		}

		if (container.parent) {
			return this.canAccept(container.parent, current)
		}

		return false
	}
}
