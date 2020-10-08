import PluginPlugin from './plugin'
import InlineWidget from '../nodes/inline-widget'
import ControlButton from '../controls/button'
import ControlInput from '../controls/input'
import ControlLink from '../controls/link'
import createElement from '../create-element'

class Link extends InlineWidget {
	fields = [ 'url' ]

	removeLink = (event, selection) => {
		this.connect(this.first)
		this.delete()
		selection.restoreSelection()
	}

	constructor(url) {
		super('link')

		this.url = url
		this.isDeleteEmpty = true

		this.controls = [
			new ControlLink({
				label: this.url,
				url: this.url
			}),
			new ControlButton({
				label: 'Удалить',
				icon: 'close-white',
				action: this.removeLink
			})
		]
		this.setElement(createElement('a', {
			href: this.url
		}))
	}

	normalize(element) {
		const fields = [ 'url' ]
		let areEqualElements = true
		let normalized

		fields.forEach((field) => {
			if (this[field] !== element[field]) {
				areEqualElements = false
			}
		})

		if (areEqualElements) {
			const node = new Link(this.url)
			const first = this.first
			const last = first.getLastNode()

			if (this.first) {
				node.append(this.first)
			}

			if (element.first) {
				// TODO: Это очень сложный normalize. Нужно вынести эту логику на уровень парсинга
				// что если во время парсинга образовалась нормализованная нода
				// то нужно перепарсить дочерние элементы
				// а здесь оставить логику попроще
				if (
					last && element.first && last.type === element.first.type && last.normalize &&
					(normalized = last.normalize(element.first))
				) {
					last.replaceWith(normalized, element.first.next)

					if (element.first.next) {
						normalized.connect(element.first.next)
					}
				} else {
					node.append(element.first)
				}
			}

			return node
		}

		return false
	}

	duplicate() {
		const duplicate = new Link(this.url)

		this.connect(duplicate)

		return duplicate
	}

	stringify(children) {
		return '<a href="' + this.url + '">' + children + '</a>'
	}
}

export default class LinkPlugin extends PluginPlugin {
	parse(element, parse, context) {
		if (element.nodeType === 1 && element.nodeName.toLowerCase() === 'a') {
			const url = element.getAttribute('href')
			let children

			const node = new Link(url)

			if (children = parse(element.firstChild, element.lastChild, context)) {
				node.append(children)
			}

			return node
		}

		return false
	}

	getSelectControls(selection) {
		let hasLink = false

		selection.selectedItems.forEach((item) => {
			if (item.type === 'link') {
				hasLink = true
			}
		})

		if (hasLink) {
			return [
				new ControlButton({
					label: 'Удалить ссылки',
					icon: 'link',
					selected: true,
					action: this.removeLinks
				})
			]
		}

		return [
			new ControlButton({
				label: 'Сделать ссылку',
				icon: 'link',
				action: this.openLinkControls
			})
		]
	}

	openLinkControls = (event, selection) => {
		selection.renderControls([
			new ControlInput({
				placeholder: 'Введите адрес ссылки',
				autofocus: true,
				action: this.setLink,
				cancel: () => selection.restoreSelection()
			}),
			new ControlButton({
				label: 'Отменить',
				icon: 'close-white',
				action: () => selection.restoreSelection()
			})
		])
	}

	removeLinks = (event, selection) => {
		selection.selectedItems.forEach((item) => {
			if (item.type === 'link') {
				item.connect(item.first)
				item.delete()
			}
		})
	}

	setLink = (event, selection) => {
		const url = event.target.value
		let link

		selection.selectedItems.forEach((item) => {
			if (item.type === 'text') {
				link = new Link(url)
				item.connect(link)
				link.push(item)
			}
		})

		selection.restoreSelection()
	}
}
