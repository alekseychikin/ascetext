import Widget from '../nodes/widget.js'
import Container from '../nodes/container.js'
import PluginPlugin from './plugin.js'
import createElement from '../utils/create-element.js'
import isHtmlElement from '../utils/is-html-element.js'

export class Image extends Widget {
	constructor(attributes = {}) {
		super('image', Object.assign({ size: '', float: 'none' }, attributes))
	}

	accept(node) {
		return node.type === 'image-caption'
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

	enterHandler(event, { builder, setSelection }) {
		const emptyParagraph = builder.createBlock()

		builder.append(this.parent.parent, emptyParagraph, this.parent.next)
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
			onSelectFile: (file, image) => Promise.resolve(image.image.src),
			placeholder: 'Add image caption (optional)',
			errorIcon: '<svg xmlns="http://www.w3.org/2000/svg" width="453" height="300" fill="none"><path stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="12" d="m6 293.5 441-287m-391 280h333.5m14.5-228V192M27.5 151l121-81 71.5 63.5m27 27 53 46.863m89.5 79.137H404V192m-14.5 94.5L300 207.363m0 0 59.5-46.863L404 192M27.5 254V27.5H377"/><circle cx="253" cy="73" r="19.5" stroke="#000" stroke-width="13"/></svg>'
		}, params)
	}

	get icons() {
		return {
			image: '<svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m3 17 4.768-5.563c.424-.494.635-.741.887-.83.22-.079.462-.077.682.005.25.092.458.342.875.842l2.666 3.2c.39.467.583.7.82.794.208.083.438.093.653.03.244-.072.459-.287.888-.717l.497-.497c.438-.438.657-.656.904-.728a.999.999 0 0 1 .659.037c.238.098.432.34.818.823L21 18m0-10.8v9.6c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874C19.48 20 18.92 20 17.8 20H6.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C3 18.48 3 17.92 3 16.8V7.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C4.52 4 5.08 4 6.2 4h11.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C21 5.52 21 6.08 21 7.2ZM15 10a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			floatLeft: '<svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 18h16M4 14h6m-6-4h6M4 6h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><mask id="imageFloatLeft" fill="#fff"><rect x="13" y="9" width="8" height="6" rx="1"/></mask><rect x="13" y="9" width="8" height="6" rx="1" stroke="currentColor" stroke-width="4" mask="url(#imageFloatLeft)"/></svg>',
			floatRight: '<svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 18h16m-6-4h6m-6-4h6M4 6h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><mask id="imageFloatRight" fill="#fff"><rect x="3" y="9" width="8" height="6" rx="1"/></mask><rect x="3" y="9" width="8" height="6" rx="1" stroke="currentColor" stroke-width="4" mask="url(#imageFloatRight)"/></svg>',
			wide: '<svg width="24" height="24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 18h16M4 6h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><mask id="a" fill="#fff"><rect x="3" y="9" width="18" height="6" rx="1"/></mask><rect x="3" y="9" width="18" height="6" rx="1" stroke="currentColor" stroke-width="4" mask="url(#a)"/></svg>'
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

	insertImage(container) {
		return async (event, { builder, restoreSelection }) => {
			const { files } = event.target

			if (files.length) {
				let src = await this.generateImagePreview(files[0])
				const image = new Image({ src })
				const caption = builder.create('image', {
					type: 'caption',
					placeholder: this.params.placeholder
				})

				builder.append(image, caption)
				builder.replace(container, image)

				try {
					src = await this.params.onSelectFile(files[0], image)
					image.image.src = src
					image.attributes.src = src
				} catch (exception) {
					console.error('exception', exception)
					builder.cut(image)
					restoreSelection()
				}
			}
		}
	}

	updateImage(image) {
		return async (event, { builder, restoreSelection }) => {
			const { files } = event.target

			if (files.length) {
				let src = await this.generateImagePreview(files[0])

				image.image.src = src

				try {
					console.log('set prevew')
					src = await this.params.onSelectFile(files[0], image)
					console.log('set attribute')
					builder.setAttribute(image, 'src', src)
				} catch (exception) {
					builder.cut(image)
					restoreSelection()
				}
			}
		}
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

	generateImagePreview(file) {
		return new Promise((resolve) => {
			const reader = new FileReader()

			reader.onload = event => {
				resolve(event.target.result)
			}

			reader.readAsDataURL(file)
		})
	}
}
