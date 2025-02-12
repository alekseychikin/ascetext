import Widget from '../nodes/widget.js'
import Container from '../nodes/container.js'
import PluginPlugin from './plugin.js'
import createElement from '../utils/create-element.js'
import findElement from '../utils/find-element.js'
import findLastNode from '../utils/find-last.js'

export class Image extends Widget {
	constructor(attributes = {}, params = {}) {
		super('image', Object.assign({ src: '', preview: '', size: '', float: 'none' }, attributes), params)

		this.src = attributes.src
	}

	render(body = []) {
		return {
			type: 'figure',
			attributes: {
				'class': this.getClassName(),
				'contenteditable': false
			},
			body: [{
				type: 'img',
				attributes: {
					src: this.src.length > 0 ? this.src : this.attributes.preview
				},
				body: []
			}].concat(body)
		}
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

		return '<figure class="' + classNames.join(' ') + '"><img src="' + this.src + '" />' + children + '</figure>'
	}

	json(children) {
		if (children) {
			return {
				type: this.type,
				src: this.src,
				preview: this.src.length ? '' : this.attributes.preview,
				figcaption: children[0]
			}
		}

		return {
			type: this.type,
			src: this.src,
			preview: this.src.length ? '' : this.attributes.preview
		}
	}

	async onMount({ builder }) {
		if (!this.src.length) {
			const file = this.createFile(this.attributes.preview)

			try {
				this.src = await this.params.onSelectFile(file, this)
			} catch (exception) {
				console.error('exception', exception)
				builder.cut(this)
			}
		}
	}

	createFile(dataURI) {
		const chunks = dataURI.split(',')
		const binary = atob(chunks[1])
		const mimeString = chunks[0].split(':')[1].split(';')[0]
		const intArray = new Uint8Array(binary.length)
		let i

		for (i = 0; i < binary.length; i++) {
			intArray[i] = binary.charCodeAt(i)
		}

		return new Blob([intArray], { type: mimeString })
	}
}

export class ImageCaption extends Container {
	constructor(attributes, params) {
		super('image-caption', attributes, params)

		this.imagePlaceholder = createElement('div', {
			style: {
				'position': 'absolute',
				'pointer-events': 'none',
				'top': '0',
				'left': '0',
				'display': 'none'
			},
			class: 'contenteditor__image-placeholder'
		})
		this.removeObserver = null
	}

	render(body) {
		return {
			type: 'figcaption',
			attributes: {
				contenteditable: true
			},
			body
		}
	}

	split(builder, next) {
		if (next || !this.parent.next) {
			const paragraph = builder.createBlock()

			builder.append(this.parent.parent, paragraph, this.parent.next)
			builder.append(paragraph, next)

			return {
				head: this.parent,
				tail: paragraph
			}
		}

		return {
			head: this.parent,
			tail: this.parent.next
		}
	}

	onMount({ controls, sizeObserver }) {
		this.imagePlaceholder.innerHTML = this.params.placeholder

		controls.registerControl(this.imagePlaceholder)
		this.removeObserver = sizeObserver.observe(this, (entry) => {
			this.imagePlaceholder.style.transform = `translate(${entry.element.left}px, ${entry.element.top}px)`
			this.imagePlaceholder.style.width = `${entry.element.width}px`
			this.inputHandler()
		})
	}

	onUnmount({ controls }) {
		if (this.removeObserver) {
			this.removeObserver()
			this.removeObserver = null
		}

		controls.unregisterControl(this.imagePlaceholder)
	}

	onCombine(builder, container) {
		builder.append(container, this.first)
		builder.cut(this.parent)
	}

	enterHandler(event, { builder, anchorOffset }) {
		const emptyParagraph = builder.createBlock()

		builder.append(this.parent.parent, emptyParagraph, this.parent.next)
		builder.moveTail(this, emptyParagraph, anchorOffset)
	}

	backspaceHandler(event, { builder, anchorAtFirstPositionInContainer, setSelection }) {
		if (anchorAtFirstPositionInContainer) {
			event.preventDefault()

			const previousSelectableNode = this.getPreviousSelectableNode()

			if (!previousSelectableNode) {
				return false
			}

			const length = previousSelectableNode.length

			builder.append(previousSelectableNode, this.first)
			setSelection(previousSelectableNode, length)
		}
	}

	inputHandler() {
		this.imagePlaceholder.style.display = this.element.outerText.trim().length ? 'none' : ''
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
	get register() {
		return {
			'image': Image,
			'image-caption': ImageCaption
		}
	}

	constructor(params = {}) {
		super(Object.assign({
			onSelectFile: (file, image) => new Promise((resolve) => {
				setTimeout(() => {
					resolve(image.attributes.preview)
				}, 1000)
			}),
			placeholder: 'Add image caption (optional)'
		}, params))

		this.toggleFloatLeft = this.toggleFloatLeft.bind(this)
		this.toggleFloatRight = this.toggleFloatRight.bind(this)
		this.toggleSizeWide = this.toggleSizeWide.bind(this)
		this.toggleSizeBanner = this.toggleSizeBanner.bind(this)
		this.normalize = this.normalize.bind(this)

		this.insertImage = this.insertImage.bind(this)
		this.updateImage = this.updateImage.bind(this)
	}

	get icons() {
		return {
			image: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m3 17 4.768-5.563c.424-.494.635-.741.887-.83.22-.079.462-.077.682.005.25.092.458.342.875.842l2.666 3.2c.39.467.583.7.82.794.208.083.438.093.653.03.244-.072.459-.287.888-.717l.497-.497c.438-.438.657-.656.904-.728a.999.999 0 0 1 .659.037c.238.098.432.34.818.823L21 18m0-10.8v9.6c0 1.12 0 1.68-.218 2.108a2 2 0 0 1-.874.874C19.48 20 18.92 20 17.8 20H6.2c-1.12 0-1.68 0-2.108-.218a2 2 0 0 1-.874-.874C3 18.48 3 17.92 3 16.8V7.2c0-1.12 0-1.68.218-2.108a2 2 0 0 1 .874-.874C4.52 4 5.08 4 6.2 4h11.6c1.12 0 1.68 0 2.108.218a2 2 0 0 1 .874.874C21 5.52 21 6.08 21 7.2ZM15 10a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
			floatLeft: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 18h16M4 14h6m-6-4h6M4 6h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><mask id="imageFloatLeft" fill="#fff"><rect x="13" y="9" width="8" height="6" rx="1"/></mask><rect x="13" y="9" width="8" height="6" rx="1" stroke="currentColor" stroke-width="4" mask="url(#imageFloatLeft)"/></svg>',
			floatRight: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 18h16m-6-4h6m-6-4h6M4 6h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><mask id="imageFloatRight" fill="#fff"><rect x="3" y="9" width="8" height="6" rx="1"/></mask><rect x="3" y="9" width="8" height="6" rx="1" stroke="currentColor" stroke-width="4" mask="url(#imageFloatRight)"/></svg>',
			wide: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 18h16M4 6h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><mask id="a" fill="#fff"><rect x="3" y="9" width="18" height="6" rx="1"/></mask><rect x="3" y="9" width="18" height="6" rx="1" stroke="currentColor" stroke-width="4" mask="url(#a)"/></svg>'
		}
	}

	parseJson(element, builder) {
		if (element.type === 'image') {
			const image = builder.create('image', { src: element.src, preview: element.preview }, this.params)
			const caption = builder.create('image-caption', {}, this.params)
			const children = element.figcaption ? builder.parseJson(element.figcaption) : undefined

			builder.append(caption, children)
			builder.append(image, caption)

			return image
		}

		return false
	}

	parseTree(element, builder) {
		if (element.type === 'figure' && findElement(element, 'img') || element.type === 'img') {
			const img = element.type === 'figure' ? findElement(element, 'img') : element
			const image = builder.create('image', { src: img.attributes.src, preview: img.attributes.preview }, this.params)
			const figcaption = element.body.find((child) => child.type === 'figcaption')
			const body = element.body.filter((child) => child.type !== 'figcaption' && child.type !== 'img')

			if (figcaption) {
				const children = builder.parseVirtualTree(figcaption.body)
				const caption = builder.create('image-caption', {}, this.params)

				builder.append(caption, children.first)
				builder.append(image, caption)
			}

			if (body.length) {
				const children = builder.parseVirtualTree(body)

				builder.append(image, children.first)
			}

			return image
		}
	}

	async parseFiles(files, builder) {
		const fragment = builder.createFragment()
		const images = files.filter((file) => file.type.substring(0, 6) === 'image/')

		await Promise.all(images.map(async (file) => {
			const preview = await this.generateImagePreview(file)
			const image = builder.create('image', { src: '', preview }, this.params)
			const caption = builder.create('image-caption', {}, this.params)

			builder.append(image, caption)
			builder.append(fragment, image)
		}))

		return fragment.first
	}

	getInsertControls(container) {
		if (!container.parent.isSection) {
			return []
		}

		return [{
			slug: 'image.upload',
			type: 'file',
			label: 'Upload image',
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
					label: 'Float right',
					icon: 'floatRight',
					selected: image.attributes.float === 'left',
					action: this.toggleFloatLeft(image)
				},
				{
					slug: 'image.floatRight',
					label: 'Float left',
					icon: 'floatLeft',
					selected: image.attributes.float === 'right',
					action: this.toggleFloatRight(image)
				},
				{
					slug: 'image.wide',
					label: 'Full wide',
					icon: 'wide',
					selected: image.attributes.size === 'wide',
					action: this.toggleSizeWide(image)
				},
				{
					slug: 'image.upload',
					type: 'file',
					label: 'Upload image',
					icon: 'image',
					action: this.updateImage(image)
				}
			]
		}

		return []
	}

	insertImage(container) {
		return async (event, { builder, setSelection }) => {
			const { files } = event.target

			if (files.length) {
				const preview = await this.generateImagePreview(files[0])
				const image = builder.create('image', { src: '', preview }, this.params)
				const caption = builder.create('image-caption', {}, this.params)

				builder.append(image, caption)
				builder.replace(container, image)
				setSelection(image)
			}
		}
	}

	updateImage(image) {
		return async (event, { builder, setSelection, restoreSelection }) => {
			// const { files } = event.target

			// if (files.length) {
			// 	try {
			// 		const src = await this.params.onSelectFile(files[0], image)

			// 		builder.setAttribute(image, 'src', src)
			// 		setSelection(image)
			// 	} catch (exception) {
			// 		builder.cut(image)
			// 		restoreSelection()
			// 	}
			// }
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

	normalize(node, builder) {
		if (node.parent.type === 'image') {
			const parent = node.parent

			// image
			//   paragraph
			//     text
			// →
			// image
			//   image-caption
			//     text

			// image
			//   list
			//     list-item
			// →
			// image
			//   image-caption
			// list
			//   list-item

			// image
			//   image-caption
			//   paragraph
			// →
			// image
			//   image-caption
			// paragraph
			if (!node.previous && node.type !== 'image-caption') {
				if (node.isContainer) {
					const caption = builder.create('image-caption')

					builder.convert(node, caption)

					return caption
				}

				if (node.type === 'text' || node.isInlineWidget) {
					const caption = builder.create('image-caption')
					const last = findLastNode(node, (child) => child.type === 'text' || child.isInlineWidget)

					builder.wrap(node, caption, last)

					return caption
				}

				builder.append(parent.parent, node, parent.next)

				return node
			}

			if (node.previous) {
				const duplicated = parent.split(builder)

				builder.append(parent.parent, node, duplicated.tail)

				return node
			}
		// root
		//   image-caption
		//     text
		// →
		// root
		//   paragraph
		//     text
		} else if (node.type === 'image-caption') {
			const paragraph = builder.createBlock()

			builder.convert(node, paragraph)

			return paragraph
		}

		// image
		// paragraph
		// →
		// image
		//   image-caption
		// paragraph
		if (node.type === 'image' && !node.first) {
			const caption = builder.create('image-caption')

			builder.append(node, caption)

			return node
		}

		return false
	}
}
