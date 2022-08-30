import Widget from '../nodes/widget'
import Container from '../nodes/container'
import PluginPlugin from './plugin'
import createElement from '../utils/create-element'
import Toolbar from '../core/toolbar'

export class Image extends Widget {
	constructor(attributes) {
		super('image', Object.assign({ size: '', float: 'none' }, attributes))

		this.onInputFileChange = this.onInputFileChange.bind(this)
		this.updateControlPosition = this.updateControlPosition.bind(this)

		this.image = createElement('img', {
			src: attributes.src
		})
		this.setElement(createElement('figure', {
			'class': this.getClassName(),
			contenteditable: false,
			tabIndex: 0
		}, [ this.image ]))
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

	onFocus(selection) {
		super.onFocus(selection)

		// if (this.src.length) {
		// 	this.createControl(selection)
		// 	this.updateControlPosition()
		// }
	}

	onBlur() {
		super.onBlur()

		// this.removeControl()
	}

	onDelete() {
		super.onDelete()

		this.removeControl()
	}

	async onInputFileChange(event) {
		const { files } = event.target

		if (files.length) {
			const src = await this.params.onSelectFile(files[0])

			this.image.src = (this.params.dir || '') + src
			this.src = (this.params.dir || '') + src
			this.updateControlPosition()

			if (!this.isFocused) {
				this.removeControl()
			}
		}
	}

	createControl(selection) {
		const content = document.createElement('span')

		this.selection = selection
		this.input = document.createElement('input')
		this.control = document.createElement('label')
		this.control.className = 'contenteditor__image-control'
		this.input.type = 'file'
		this.input.className = 'contenteditor__image-control-input'
		content.appendChild(document.createTextNode('Загрузить фотографию'))
		this.control.appendChild(content)
		this.control.appendChild(this.input)
		document.body.appendChild(this.control)
		this.input.addEventListener('change', this.onInputFileChange)
		this.addResizeEventListener(this.updateControlPosition)
		this.toolbar = new Toolbar(this.control)
	}

	removeControl() {
		if (this.control) {
			this.input.removeEventListener('change', this.onInputFileChange)
			this.control.parentNode.removeChild(this.control)
			this.toolbar.destroy()

			delete this.input
			delete this.control
		}

		this.removeResizeEventListener(this.updateControlPosition)
	}

	updateControlPosition() {
		setTimeout(() => {
			if (this.control) {
				const scrollTop = document.body.scrollTop || document.documentElement.scrollTop
				const imageBoundingClientRect = this.element.getBoundingClientRect()

				this.control.style.top = imageBoundingClientRect.top + scrollTop + 'px'
				this.control.style.left = imageBoundingClientRect.left + 'px'
				this.control.style.width = this.element.offsetWidth + 'px'
				this.control.style.height = this.element.offsetHeight + 'px'
			}
		}, 1)
	}

	stringify(children) {
		const classNames = [ 'image' ]

		if (children.length) {
			classNames.push('image--with-caption')
		}

		console.log(this)
		if (this.attributes.size.length) {
			classNames.push(`image--size-${this.attributes.size}`)
		}

		if (this.attributes.float !== 'none') {
			classNames.push(`image--float-${this.attributes.float}`)
		}

		return '<figure class="' + classNames.join(' ') + '"><img src="' + this.attributes.src + '" />' + children + '</figure>'
	}
}

export class ImageCaption extends Container {
	constructor() {
		super('image-caption')

		this.setElement(createElement('figcaption', {
			contenteditable: true
		}))
	}

	enterHandler(event, { builder, setSelection }) {
		const emptyParagraph = builder.createBlock()

		builder.connect(this.parent, emptyParagraph)
		setSelection(emptyParagraph)
	}

	stringify(children) {
		if (children.length) {
			return '<figcaption>' + children + '</figcaption>'
		}

		return ''
	}
}

export default class ImagePlugin extends PluginPlugin {
	constructor(params) {
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
			})
		}, params)
	}

	get icons() {
		return {
			image: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M22.5 4.5H1.5V19.5H22.5V4.5ZM21 6H3V18H21V6ZM14.25 10.1893L14.7803 10.7197L19.2803 15.2197L18.2197 16.2803L14.25 12.3107L11.7803 14.7803L11.25 15.3107L10.7197 14.7803L9 13.0607L5.78033 16.2803L4.71967 15.2197L8.46967 11.4697L9 10.9393L9.53033 11.4697L11.25 13.1893L13.7197 10.7197L14.25 10.1893ZM10.5 10.5C11.3284 10.5 12 9.82843 12 9C12 8.17157 11.3284 7.5 10.5 7.5C9.67157 7.5 9 8.17157 9 9C9 9.82843 9.67157 10.5 10.5 10.5Z" fill="#fff"/>\
</svg>',
			floatRight: '<svg width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">\
<mask id="a" fill="#fff"><rect width="9" height="9" rx="1"/></mask>\
<rect width="9" height="9" rx="1" stroke="#000" stroke-width="2.6" mask="url(#a)"/>\
<path fill="#000" d="M12 1.3h8v1.3h-8zM12 6.6h8v1.3h-8zM0 12h20v1.3H0zM0 17.4h20v1.3H0z"/>\
</svg>',
			floatLeft: '<svg width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg">\
<mask id="b" fill="#fff"><rect x="11" width="9" height="9" rx="1"/></mask>\
<rect x="11" width="9" height="9" rx="1" stroke="#000" stroke-width="2.6" mask="url(#b)"/>\
<path fill="#000" d="M0 1.3h8v1.3H0zM0 6.6h8v1.3H0zM0 12h20v1.3H0zM0 17.4h20v1.3H0z"/>\
</svg>',
			wide: '<svg width="26" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">\
<rect x=".65" y="3.95" width="24.7" height="9.7" rx="1.35" stroke="#000" stroke-width="1.3"/>\
<path fill="#000" d="M4 0h18v1H4zM4 17h18v1H4z"/>\
</svg>'
		}
	}

	create(params) {
		return new Image(params)
	}

	match(element) {
		if (element.nodeType === 1 && element.nodeName.toLowerCase() === 'figure' && element.className.indexOf('image') > -1) {
			return true
		}

		return false
	}

	parse(element, builder, context) {
		if (element.nodeType === 1 && element.nodeName.toLowerCase() === 'figure' && element.className.indexOf('image') > -1) {
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

			const imgElement = element.querySelector('img')
			const captionElement = element.querySelector('figcaption')
			const captionChildren = captionElement
				? builder.parse(captionElement.firstChild, captionElement.lastChild, context)
				: builder.create('breakLine')
			const image = new Image({ src: imgElement.src, size, float})
			const caption = new ImageCaption()

			if (captionChildren) {
				builder.append(caption, captionChildren)
			}

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
					label: 'Обтекание справа',
					icon: 'floatLeft',
					selected: image.attributes.float === 'left',
					action: this.toggleFloatLeft(image)
				},
				{
					label: 'Обтекание слева',
					icon: 'floatLeft',
					selected: image.attributes.float === 'right',
					action: this.toggleFloatRight(image)
				},
				{
					label: 'Широкая картинка',
					icon: 'wide',
					selected: image.attributes.size === 'wide',
					action: this.toggleSizeWide(image)
				},
				{
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
		return () => {
			image.attributes.size = ''
			image.attributes.float = image.attributes.float === 'left' ? 'none' : 'left'
			image.element.className = image.getClassName()
		}
	}

	toggleFloatRight(image) {
		return () => {
			image.attributes.size = ''
			image.attributes.float = image.attributes.float === 'right' ? 'none' : 'right'
			image.element.className = image.getClassName()
		}
	}

	toggleSizeWide(image) {
		return () => {
			image.attributes.float = 'none'
			image.attributes.size = image.attributes.size === 'wide' ? '' : 'wide'
			image.element.className = image.getClassName()
		}
	}

	toggleSizeBanner(image) {
		return () => {
			image.attributes.float = 'none'
			image.attributes.size = image.attributes.size === 'banner' ? '' : 'banner'
			image.element.className = image.getClassName()
		}
	}

	getInsertControls(container) {
		if (!container.parent.isSection) {
			return []
		}

		return [{
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
				const src = await this.params.onSelectFile(files[0])
				const image = new Image({
					src: (this.params.dir || '') + src
				})
				const caption = new ImageCaption()

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
				const src = await this.params.onSelectFile(files[0])

				image.image.src = src
			}
		}
	}
}
