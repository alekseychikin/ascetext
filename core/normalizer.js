import { operationTypes } from './builder.js'
import isFunction from '../utils/is-function.js'
import { hasRoot } from '../utils/find-parent.js'

export default class Normalizer {
	constructor(core, trimTrailingContainer = false) {
		this.normalizeHandle = this.normalizeHandle.bind(this)
		this.onChange = this.onChange.bind(this)
		this.trimTrailingContainer = trimTrailingContainer

		this.core = core
		this.unnormalizedNodes = []
		this.core.builder.subscribe(this.onChange)
	}

	onChange(event) {
		if (!this.core.model.contains(event.target) || this.core.timeTravel.isLockPushChange) {
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
		if (node && !this.unnormalizedNodes.includes(node)) {
			this.unnormalizedNodes.push(node)
		}
	}

	normalizeHandle() {
		this.normalize(this.unnormalizedNodes)
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
					if (next = this.walkUp(current)) {
						current = next

						continue
					}

					if (next = this.walkDown(current)) {
						current = next

						continue
					}

					break
				}
			}
		}

		if (!this.trimTrailingContainer) {
			this.root()
		}
	}

	walkUp(node) {
		let current = node
		let next

		while (current && current.type !== 'root') {
			current = current.deepesetLastNode()

			while (current.previous) {
				if (next = this.handleWalkUp(node, current)) {
					return next
				}

				current = current.previous
			}

			if (next = this.handleWalkUp(node, current)) {
				return next
			}

			while (!current.previous) {
				current = current.parent

				if (current.type === 'root') {
					break
				}

				if (next = this.handleWalkUp(node, current)) {
					return next
				}
			}

			current = current.previous
		}

		return false
	}

	handleWalkUp(node, current) {
		let next

		if (next = this.empty(node, current)) {
			return next
		}

		if (next = this.join(node, current)) {
			return next
		}

		return false
	}

	walkDown(node) {
		let current = node
		let next

		while (current && current.type !== 'root') {
			current = current.deepesetFirstNode()

			while (current.next) {
				if (current.first) {
					current = current.deepesetFirstNode()
					break
				}

				if (next = this.accept(node, current)) {
					return next
				}

				current = current.next
			}

			if (next = this.accept(node, current)) {
				return next
			}

			while (!current.next) {
				current = current.parent

				if (current.type === 'root') {
					break
				}

				if (next = this.accept(node, current)) {
					return next
				}
			}

			current = current.next
		}

		return false
	}

	empty(node, current) {
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

	accept(node, current) {
		let parent = current.parent

		if (!this.canAccept(parent, current)) {
			console.log(parent, current)

			const anchor = current.next
			let adopted

			if (adopted = this.canAdopt(parent, current)) {
				return adopted
			}

			this.core.builder.cut(current)

			return node !== current ? node : anchor || parent
		}

		if (!parent.accept(current) || !current.fit(parent)) {
			let next = parent.next

			if (current.next) {
				const duplicated = parent.split(this.core.builder, current.next)

				next = duplicated.tail
				parent = duplicated.head
			}

			this.core.builder.append(parent.parent, current, next)

			return node
		}

		return false
	}

	join(node, current) {
		let joined

		if (joined = this.handleJoin(current)) {
			if (current === node) {
				return joined
			}

			return node
		}

		return false
	}

	handleJoin(node) {
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

	canAdopt(container, current) {
		if (
			container.adopt(current) && current.fit(container) ||
			container.accept(current) && current.accommodate(container)
		) {
			const mutated = this.core.plugins.reduce((parsed, plugin) => {
				if (parsed) return parsed

				if (isFunction(plugin.mutate)) {
					return plugin.mutate(current, this.core.builder)
				}

				return false
			}, false)

			console.log('mutated', mutated)

			return mutated
		}

		return false
	}

	root() {
		const last = this.core.model.last

		if (!last || !last.isContainer || !last.isEmpty) {
			const block = this.core.builder.createBlock()

			this.core.builder.append(this.core.model, block)
			this.empty(block, block)
		}
	}
}
