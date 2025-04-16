import { operationTypes } from './builder.js'
import isFunction from '../utils/is-function.js'
import findParent, { hasRoot } from '../utils/find-parent.js'

function isLastText(node) {
	let current = node

	do {
		if (!current.next) {
			current = current.parent

			if (!current.isInlineWidget) {
				return true
			}

			continue
		}

		return !current.next || current.next.type === 'breakLine'
	} while (current)
}

function isFirstText(node) {
	let current = node

	do {
		if (!current.previous) {
			current = current.parent

			if (!current.isInlineWidget) {
				return true
			}

			continue
		}

		return !current.previous || current.previous.type === 'breakLine'
	} while (current)
}

function previousTextFinishesSpace(node) {
	let current = node

	do {
		if (!current.previous) {
			current = current.parent

			if (!current.isInlineWidget && current.type !== 'text') {
				break
			}

			continue
		}

		current = current.previous

		while (current.last) {
			current = current.last
		}

		return current.type === 'text' && current.attributes.content.match(/[^\S\n\u00a0]$/)
	} while (current)

	return false
}

export default class Normalizer {
	constructor(core) {
		this.normalizeHandle = this.normalizeHandle.bind(this)
		this.onChange = this.onChange.bind(this)
		this.pushNode = this.pushNode.bind(this)
		this.trimTrailingContainer = core.params.trimTrailingContainer

		this.core = core
		this.unnormalizedNodes = []
		this.unnormalizedParents = []
		this.core.builder.subscribe(this.onChange)
		this.normalizeHandlers = core.plugins.filter((plugin) => isFunction(plugin.normalize)).map((plugin) => plugin.normalize)
	}

	onChange(event) {
		if (!this.core.model.contains(event.target) || this.core.timeTravel.isLockPushChange) {
			return
		}

		let current

		switch (event.type) {
			case operationTypes.APPEND:
				this.pushNode(event.last.next)

				current = event.target

				do {
					this.pushNode(current)
				} while (current !== event.last && (current = current.next))

				break
			case operationTypes.CUT:
				this.pushNode(event.last.next)
				this.pushParent(event.target.parent)

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

	pushParent(node) {
		if (node && !this.unnormalizedParents.includes(node)) {
			this.unnormalizedParents.push(node)
		}
	}

	normalizeHandle() {
		this.normalize(this.unnormalizedNodes)
		this.normalizeParents(this.unnormalizedParents)
	}

	normalize(nodes) {
		let node
		let current

		while (node = nodes.shift()) {
			if (hasRoot(node)) {
				current = node

				this.walk(current)
			}
		}
	}

	normalizeParents(nodes) {
		const { builder } = this.core
		let node

		while (node = nodes.shift()) {
			if (hasRoot(node) && node.parent) {
				this.handleNode(node)
			}
		}

		if (!this.trimTrailingContainer) {
			let last = this.core.model.last

			if (!last || !last.isContainer || !last.isEmpty) {
				last = builder.createBlock()

				builder.append(this.core.model, last)
				this.empty(last)
			}
		}
	}

	walk(node) {
		let entity = node
		let current = entity.deepesetFirstNode()
		let next
		let safety = 1000

		while (--safety) {
			if (!current.parent) {
				break
			}

			if (next = this.handleNode(current)) {
				if (entity.contains(next)) {
					current = next
				} else if (next.parent) {
					entity = next
					current = entity.deepesetFirstNode()
				}

				continue
			}

			if (!entity.contains(current) || entity === current) {
				break
			}

			if (current.next) {
				current = current.next.deepesetFirstNode()

				continue
			}

			if (current.parent) {
				current = current.parent

				continue
			}

			break
		}

		if(!safety) {
			console.error('safety alarm')
		}
	}

	empty(node) {
		const { builder } = this.core

		if (node.isContainer && node.isEmpty && !node.first) {
			builder.append(node, builder.create('text', { content: '' }))
		}
	}

	handleNode(node) {
		const { builder } = this.core
		const handled = this.normalizeHandlers.reduce((parsed, handler) => {
			if (parsed) return parsed

			return handler(node, builder)
		}, false)

		if (handled) {
			return handled
		}

		if (node.parent.isContainer) {
			const parent = node.parent

			if (node.isContainer) {
				builder.append(parent, node.first, node.next)
				builder.cut(node)

				return parent
			}

			if (node.type !== 'text' && !node.isInlineWidget) {
				const duplicated = parent.split(builder, node)

				builder.push(parent.parent, node, duplicated.tail)
				builder.cutEmpty(parent)
				builder.cutEmpty(duplicated.tail)

				return node
			}
		}

		this.handleText(node)
		this.empty(node)

		return false
	}

	handleText(node) {
		const { builder } = this.core
		let container

		if (node.type === 'text' && (container = findParent(node, (child) => child.isContainer))) {
			let match

			if (!node.length && !(container.first === container.last)) {
				const next = node.previous || node.next || node.parent

				builder.cut(node)

				return next
			}

			if (container.trimWhiteSpaces) {
				if (isLastText(node) && node.attributes.content.match(/[^\S\u00a0]+$/)) {
					const content = node.attributes.content.replace(/[^\S\u00a0]+$/, '')
					const next = node.previous || node.next || node.parent

					builder.setAttribute(node, 'content', content)

					if (!container.length) {
						builder.cut(container)

						return container
					}

					return next
				}

				if (isFirstText(node) && node.attributes.content.match(/^[^\S\u00a0]+/)) {
					const content = node.attributes.content.replace(/^[^\S\u00a0]+/, '')
					const next = node.previous || node.next || node.parent

					builder.setAttribute(node, 'content', content)

					if (!container.length) {
						builder.cut(container)

						return container
					}

					return next
				}

				if (node.attributes.content[0] === ' ' && previousTextFinishesSpace(node)) {
					const content = '\u00a0' + node.attributes.content.substr(1)

					builder.setAttribute(node, 'content', content)

					return node
				}
			}

			if (container.parent.isSection && (match = node.attributes.content.match(/[\u0020\t]*\n\n[\u0020\t]*/))) {
				const parent = node.parent
				const right = builder.splitByOffset(parent, match.index + match[0].length)
				const left = builder.splitByOffset(parent, match.index)

				builder.splitByTail(container.parent, right.tail)
				builder.cut(left.tail)

				return container
			}

			if (container.trimWhiteSpaces) {
				if (match = node.attributes.content.match(/[^\S\u00a0]{2,}/)) {
					const content = node.attributes.content.replace(/[^\S\u00a0]{2,}/g, ' ')

					builder.setAttribute(node, 'content', content)

					return node
				}
			}
		}
	}
}
