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

		let current

		switch (event.type) {
			case operationTypes.APPEND:
				this.pushNode(event.last.next)

				current = event.last

				do {
					this.pushNode(current)
				} while (current !== event.target && (current = current.previous))

				break
			case operationTypes.CUT:
				this.pushNode(event.last.next)

				break
			case operationTypes.ATTRIBUTE:
				this.pushNode(event.target.next)
				this.pushNode(event.target)

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

		while (node = nodes.shift()) {
			if (hasRoot(node)) {
				current = node

				this.walkUp(current)

				// while (current && limit-- > 0) {
				// 	if (next = this.walkUp(current)) {
				// 		current = next

				// 		continue
				// 	}

				// 	if (next = this.walkDown(current)) {
				// 		current = next

				// 		continue
				// 	}

				// 	break
				// }
			}
		}

		if (!this.trimTrailingContainer) {
			this.root()
		}
	}

	walkUp(node) {
		console.log('walkUp node', node)
		let current = node.deepesetLastNode()
		let next

		while (true) {
			if (next = this.handleNode(current)) {
				current = next

				continue
			}

			if (current === node) {
				break
			}

			if (current.previous) {
				current = current.previous.deepesetLastNode()

				continue
			}

			if (current.parent) {
				current = current.parent

				continue
			}

			break
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
		let last = this.core.model.last

		if (!last || !last.isContainer || !last.isEmpty) {
			last = this.core.builder.createBlock()

			this.core.builder.append(this.core.model, last)
		}

		this.empty(last, last)
	}

	handleNode(node) {
		const { builder } = this.core
		const handled = this.core.plugins.reduce((parsed, plugin) => {
			if (parsed) return parsed

			if (isFunction(plugin.normalize)) {
				return plugin.normalize(node, builder)
			}

			return false
		}, false)

		if (handled) {
			return handled
		}

		// в контейнере может находиться текст или инлайн-виджет
		// ! если в контейнер попадает контейнер, нужно переместить из него дочерние элементы
		// ! если в контейнер попадает виджет или секция, нужно поделить контейнер пополам и разместить секцию или виджет между ними
		if (node.parent.isContainer) {
			const parent = node.parent

			if (node.isContainer) {
				const first = node.first

				builder.append(parent, first, node.next)
				builder.cut(node)

				return node
			}

			const duplicated = parent.split(builder, node)

			builder.push(parent, node, duplicated.tail)

			if (!parent.first) {
				builder.cut(parent)
			}

			return node
		}
	}
}
