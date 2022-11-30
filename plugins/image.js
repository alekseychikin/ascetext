import Widget from '../nodes/widget'
import Container from '../nodes/container'
import PluginPlugin from './plugin'
import createElement from '../utils/create-element'
import isHtmlElement from '../utils/is-html-element'

export class Image extends Widget {
	constructor(attributes = {}) {
		super('image', Object.assign({ size: '', float: 'none' }, attributes))
	}

	render() {
		this.image = createElement('img', {
			src: this.attributes.src
		})

		return createElement('figure', {
			'class': this.getClassName(),
			'contenteditable': false,
			'tabIndex': 0
		}, [ this.image ])
	}

	update(previous) {
		if (previous.src !== this.attributes.src) {
			this.image.src = this.attributes.src
		}

		this.element.className = this.getClassName()
	}

	getClassName() {
		const classNames = [ 'image' ]

		if (this.attributes.size.length) {
			classNames.push(`image--size-${this.attributes.size}`)
		}

		if (this.attributes.float !== 'none') {
			classNames.push(`image--float-${this.attributes.float}`)
		}

		return classNames.join(' ')
	}

	stringify(children) {
		const classNames = [ 'image' ]

		if (children.length) {
			classNames.push('image--with-caption')
		}

		if (this.attributes.size.length) {
			classNames.push(`image--size-${this.attributes.size}`)
		}

		if (this.attributes.float !== 'none') {
			classNames.push(`image--float-${this.attributes.float}`)
		}

		return '<figure class="' + classNames.join(' ') + '"><img src="' + this.attributes.src + '" />' + children + '</figure>'
	}

	json(children) {
		if (children) {
			return {
				type: this.type,
				src: this.attributes.src,
				figcaption: children[0]
			}
		}

		return {
			type: this.type,
			src: this.attributes.src
		}
	}
}

export class ImageCaption extends Container {
	constructor(params) {
		super('image-caption', params)

		this.removeObserver = null
	}

	render() {
		return createElement('figcaption', {
			contenteditable: true
		})
	}

	onMount({ controls, sizeObserver }) {
		this.placeholder = createElement('div', {
			style: {
				'position': 'absolute',
				'pointer-events': 'none',
				'top': '0',
				'left': '0'
			},
			class: 'contenteditor__image-placeholder'
		})
		this.placeholder.appendChild(document.createTextNode(this.attributes.placeholder))

		this.removeObserver = sizeObserver.observe(this.element, (entry) => {
			this.placeholder.style.transform = `translate(${entry.element.left}px, ${entry.element.top + entry.scrollTop}px)`
			this.placeholder.style.width = `${entry.element.width}px`
		})
		controls.registerControl(this.placeholder)
		this.inputHandler()
	}

	onUnmount({ controls }) {
		this.removeObserver()
		controls.unregisterControl(this.placeholder)
	}

	accept(node) {
		return node.type === 'image'
	}

	enterHandler(event, { builder, setSelection }) {
		const emptyParagraph = builder.createBlock()

		builder.connect(this.parent, emptyParagraph)
		setSelection(emptyParagraph)
	}

	inputHandler() {
		this.placeholder.style.display = this.element.innerText.trim() ? 'none' : ''
	}

	stringify(children) {
		if (children.length) {
			return '<figcaption>' + children + '</figcaption>'
		}

		return ''
	}

	json(children) {
		if (children) {
			return children
		}

		return null
	}
}

export default class ImagePlugin extends PluginPlugin {
	constructor(params = {}) {
		super()

		this.toggleFloatLeft = this.toggleFloatLeft.bind(this)
		this.toggleFloatRight = this.toggleFloatRight.bind(this)
		this.toggleSizeWide = this.toggleSizeWide.bind(this)
		this.toggleSizeBanner = this.toggleSizeBanner.bind(this)

		this.insertImage = this.insertImage.bind(this)
		this.updateImage = this.updateImage.bind(this)
		this.params = Object.assign({
			onSelectFile: (file) => new Promise((resolve) => {
				const reader = new FileReader()

				reader.onload = event => {
					resolve(event.target.result)
				}

				reader.readAsDataURL(file)
			}),
			placeholder: 'Add image caption (optional)'
		}, params)
	}

	get icons() {
		return {
			image: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M22.5 4.5H1.5V19.5H22.5V4.5ZM21 6H3V18H21V6ZM14.25 10.1893L14.7803 10.7197L19.2803 15.2197L18.2197 16.2803L14.25 12.3107L11.7803 14.7803L11.25 15.3107L10.7197 14.7803L9 13.0607L5.78033 16.2803L4.71967 15.2197L8.46967 11.4697L9 10.9393L9.53033 11.4697L11.25 13.1893L13.7197 10.7197L14.25 10.1893ZM10.5 10.5C11.3284 10.5 12 9.82843 12 9C12 8.17157 11.3284 7.5 10.5 7.5C9.67157 7.5 9 8.17157 9 9C9 9.82843 9.67157 10.5 10.5 10.5Z" fill="currentColor"/>\
</svg>',
			floatRight: '<svg width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">\
<mask id="a" fill="#fff"><rect width="9" height="9" rx="1"/></mask>\
<rect width="9" height="9" rx="1" stroke="currentColor" stroke-width="2.6" mask="url(#a)"/>\
<path d="M12 1.3h8v1.3h-8zM12 6.6h8v1.3h-8zM0 12h20v1.3H0zM0 17.4h20v1.3H0z" fill="currentColor"/>\
</svg>',
			floatLeft: '<svg width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">\
<mask id="b" fill="#fff"><rect x="11" width="9" height="9" rx="1"/></mask>\
<rect x="11" width="9" height="9" rx="1" stroke="currentColor" stroke-width="2.6" mask="url(#b)"/>\
<path d="M0 1.3h8v1.3H0zM0 6.6h8v1.3H0zM0 12h20v1.3H0zM0 17.4h20v1.3H0z" fill="currentColor"/>\
</svg>',
			wide: '<svg width="26" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">\
<rect x=".65" y="3.95" width="24.7" height="9.7" rx="1.35" stroke="currentColor" stroke-width="1.3"/>\
<path fill="currentColor" d="M4 0h18v1H4zM4 17h18v1H4z"/>\
</svg>'
		}
	}

	create(params) {
		const { type, ...attributes } = params

		if (type === 'caption') {
			return new ImageCaption(attributes)
		}

		return new Image(attributes)
	}

	parse(element, builder) {
		if (isHtmlElement(element) && element.matches('figure.image')) {
			const classNames = element.className.split(/\s+/)
			let size = ''
			let float = 'none'

			classNames.forEach((className) => {
				const sizeMatched = className.match(/image--size-(.*)/)
				const floatMatched = className.match(/image--float-(.*)/)

				if (sizeMatched) {
					size = sizeMatched[1]
				}

				if (floatMatched) {
					float = floatMatched[1]
				}
			})

			return builder.create('image', { src: element.querySelector('img').src, size, float })
		}

		if (isHtmlElement(element) && element.matches('figcaption')) {
			return builder.create('image', {
				type: 'caption',
				placeholder: this.params.placeholder
			})
		}
	}

	parseJson(element, builder) {
		if (element.type === 'image') {
			const image = builder.create('image', { src: element.src })
			const caption = builder.create('image', {
				type: 'caption',
				placeholder: this.params.placeholder
			})
			const children = element.figcaption ? builder.parseJson(element.figcaption) : builder.create('breakLine')

			builder.append(caption, children)
			builder.append(image, caption)

			return image
		}

		return false
	}

	getSelectControls(focusedNodes, isRange) {
		let image

		focusedNodes.forEach((item) => {
			if (item.type === 'image') {
				image = item
			}
		})

		if (image && !isRange) {
			return [
				{
					slug: 'image.floatLeft',
					label: 'Обтекание справа',
					icon: 'floatRight',
					selected: image.attributes.float === 'left',
					action: this.toggleFloatLeft(image)
				},
				{
					slug: 'image.floatRight',
					label: 'Обтекание слева',
					icon: 'floatLeft',
					selected: image.attributes.float === 'right',
					action: this.toggleFloatRight(image)
				},
				{
					slug: 'image.wide',
					label: 'Широкая картинка',
					icon: 'wide',
					selected: image.attributes.size === 'wide',
					action: this.toggleSizeWide(image)
				},
				{
					slug: 'image.upload',
					type: 'file',
					label: 'Обновить картинку',
					icon: 'image',
					action: this.updateImage(image)
				}
			]
		}

		return []
	}

	toggleFloatLeft(image) {
		return (event, { builder }) => {
			builder.setAttribute(image, 'size', '')
			builder.setAttribute(image, 'float', image.attributes.float === 'left' ? 'none' : 'left')
		}
	}

	toggleFloatRight(image) {
		return (event, { builder }) => {
			builder.setAttribute(image, 'size', '')
			builder.setAttribute(image, 'float', image.attributes.float === 'right' ? 'none' : 'right')
		}
	}

	toggleSizeWide(image) {
		return (event, { builder }) => {
			builder.setAttribute(image, 'float', 'none')
			builder.setAttribute(image, 'size', image.attributes.size === 'wide' ? '' : 'wide')
		}
	}

	toggleSizeBanner(image) {
		return (event, { builder }) => {
			builder.setAttribute(image, 'float', 'none')
			builder.setAttribute(image, 'size', image.attributes.size === 'banner' ? '' : 'banner')
		}
	}

	getInsertControls(container) {
		if (!container.parent.isSection) {
			return []
		}

		return [{
			slug: 'image.upload',
			type: 'file',
			label: 'Вставить картинку',
			icon: 'image',
			action: this.insertImage(container)
		}]
	}

	insertImage(container) {
		return async (event, { builder }) => {
			const { files } = event.target

			if (files.length) {
				const image = builder.create('image', { src: '' })
				const src = await this.params.onSelectFile(files[0], image)
				const caption = builder.create('image', {
					type: 'caption',
					placeholder: this.params.placeholder
				})

				builder.setAttribute(image, 'src', src)
				builder.append(caption, builder.create('breakLine'))
				builder.append(image, caption)
				builder.replace(container, image)
			}
		}
	}

	updateImage(image) {
		return async (event) => {
			const { files } = event.target

			if (files.length) {
				const src = await this.params.onSelectFile(files[0], image)

				image.setSrc(src)
			}
		}
	}
}
