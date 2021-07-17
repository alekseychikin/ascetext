const Widget = require('../nodes/widget')
const Container = require('../nodes/container')
const Paragraph = require('../plugins/paragraph').Paragraph
const BreakLine = require('../plugins/break-line').BreakLine
const PluginPlugin = require('./plugin')
const ControlButton = require('../controls/button')
const ControlFile = require('../controls/file')
const createElement = require('../create-element')
const Toolbar = require('../toolbar')

class Image extends Widget {
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
		console.log('onFocus')
		super.onFocus(selection)

		if (this.src.length) {
			this.createControl(selection)
			this.updateControlPosition()
		}
	}

	onBlur() {
		super.onBlur()

		this.removeControl()
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
		this.control.className = 'rich-editor__image-control'
		this.input.type = 'file'
		this.input.className = 'rich-editor__image-control-input'
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

class ImageCaption extends Container {
	constructor() {
		super('image-caption')

		this.setElement(createElement('figcaption', {
			contenteditable: true
		}))
		this.append(new BreakLine())
	}

	enterHandler(event, { setSelection }) {
		const emptyParagraph = new Paragraph()

		emptyParagraph.append(new BreakLine())
		this.parent.connect(emptyParagraph)
		setSelection(emptyParagraph, 0)
	}

	stringify(children) {
		if (children.length) {
			return '<figcaption>' + children + '</figcaption>'
		}

		return ''
	}
}

class ImagePlugin extends PluginPlugin {
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

	match(element) {
		if (element.nodeType === 1 && element.nodeName.toLowerCase() === 'figure' && element.className.indexOf('image') > -1) {
			return true
		}

		return false
	}

	parse(element, parse, context) {
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
				? parse(captionElement.firstChild, captionElement.lastChild, context)
				: new BreakLine()
			const image = new Image({ src: imgElement.src, size, float})
			const caption = new ImageCaption()

			if (captionChildren) {
				caption.append(captionChildren)
			}

			image.append(caption)

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
				new ControlButton({
					label: 'Обтекание справа',
					icon: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M11 4H15V5H11V4ZM8 5H2V11H8V5ZM2 4H1V5V11V12H2H8H9V11V5V4H8H2ZM13 6H11V7H13V6Z" fill="white"/>\
<path d="M13 11H11V12H13V11Z" fill="white"/>\
<path d="M15 9H11V10H15V9Z" fill="white"/>\
<path d="M5 1H13V2H5V1Z" fill="white"/>\
<path d="M5 14H13V15H5V14Z" fill="white"/>\
</svg>',
					selected: image.attributes.float === 'left',
					action: (event, params) => this.toggleFloatLeft(event, params, image)
				}),
				new ControlButton({
					label: 'Обтекание слева',
					icon: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M1 4H5V5H1V4ZM14 5H8V11H14V5ZM8 4H7V5V11V12H8H14H15V11V5V4H14H8ZM3 6H1V7H3V6Z" fill="white"/>\
<path d="M3 11H1V12H3V11Z" fill="white"/>\
<path d="M5 9H1V10H5V9Z" fill="white"/>\
<path d="M3 1H11V2H3V1Z" fill="white"/>\
<path d="M3 14H11V15H3V14Z" fill="white"/>\
</svg>',
					selected: image.attributes.float === 'right',
					action: (event, params) => this.toggleFloatRight(event, params, image)
				}),
				new ControlButton({
					label: 'Широкая картинка',
					icon: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M4 1H12V2H4V1ZM13 5H3V11H13V5ZM3 4H2V5V11V12H3H13H14V11V5V4H13H3ZM12 14H4V15H12V14Z" fill="#fff"/>\
</svg>',
					selected: image.attributes.size === 'wide',
					action: (event, params) => this.toggleSizeWide(event, params, image)
				}),
				new ControlButton({
					label: 'Банер',
					icon: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M4 1H12V2H4V1ZM14 5H2V11H14V5ZM2 4H1V5V11V12H2H14H15V11V5V4H14H2ZM12 14H4V15H12V14Z" fill="#fff"/>\
</svg>',
					selected: image.attributes.size === 'banner',
					action: (event, params) => this.toggleSizeBanner(event, params, image)
				}),
				new ControlFile({
					label: 'Обновить картинку',
					icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
	<path fill-rule="evenodd" clip-rule="evenodd" d="M22.5 4.5H1.5V19.5H22.5V4.5ZM21 6H3V18H21V6ZM14.25 10.1893L14.7803 10.7197L19.2803 15.2197L18.2197 16.2803L14.25 12.3107L11.7803 14.7803L11.25 15.3107L10.7197 14.7803L9 13.0607L5.78033 16.2803L4.71967 15.2197L8.46967 11.4697L9 10.9393L9.53033 11.4697L11.25 13.1893L13.7197 10.7197L14.25 10.1893ZM10.5 10.5C11.3284 10.5 12 9.82843 12 9C12 8.17157 11.3284 7.5 10.5 7.5C9.67157 7.5 9 8.17157 9 9C9 9.82843 9.67157 10.5 10.5 10.5Z" fill="#fff"/>\
	</svg>',
					action: (event, params) => this.updateImage(image, event, params)
				})

			]
		}

		return []
	}

	toggleFloatLeft(event, { restoreSelection }, image) {
		image.attributes.size = ''
		image.attributes.float = image.attributes.float === 'left' ? 'none' : 'left'
		image.element.className = image.getClassName()
		restoreSelection()
	}

	toggleFloatRight(event, { restoreSelection }, image) {
		image.attributes.size = ''
		image.attributes.float = image.attributes.float === 'right' ? 'none' : 'right'
		image.element.className = image.getClassName()
		restoreSelection()
	}

	toggleSizeWide(event, { restoreSelection }, image) {
		image.attributes.float = 'none'
		image.attributes.size = image.attributes.size === 'wide' ? '' : 'wide'
		image.element.className = image.getClassName()
		restoreSelection()
	}

	toggleSizeBanner(event, { restoreSelection }, image) {
		image.attributes.float = 'none'
		image.attributes.size = image.attributes.size === 'banner' ? '' : 'banner'
		image.element.className = image.getClassName()
		restoreSelection()
	}

	getInsertControls() {
		return [
			new ControlFile({
				label: 'Вставить картинку',
				icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path fill-rule="evenodd" clip-rule="evenodd" d="M22.5 4.5H1.5V19.5H22.5V4.5ZM21 6H3V18H21V6ZM14.25 10.1893L14.7803 10.7197L19.2803 15.2197L18.2197 16.2803L14.25 12.3107L11.7803 14.7803L11.25 15.3107L10.7197 14.7803L9 13.0607L5.78033 16.2803L4.71967 15.2197L8.46967 11.4697L9 10.9393L9.53033 11.4697L11.25 13.1893L13.7197 10.7197L14.25 10.1893ZM10.5 10.5C11.3284 10.5 12 9.82843 12 9C12 8.17157 11.3284 7.5 10.5 7.5C9.67157 7.5 9 8.17157 9 9C9 9.82843 9.67157 10.5 10.5 10.5Z" fill="#fff"/>\
</svg>',
				action: this.insertImage
			})
		]
	}

	async insertImage(event, { getAnchorContainer, restoreSelection }) {
		const { files } = event.target

		if (files.length) {
			const src = await this.params.onSelectFile(files[0])
			const image = new Image({
				src: (this.params.dir || '') + src
			})
			const caption = new ImageCaption()

			image.append(caption)
			getAnchorContainer().replace(image)
			restoreSelection()
		}
	}

	async updateImage(image, event) {
		const { files } = event.target

		if (files.length) {
			const src = await this.params.onSelectFile(files[0])

			image.image.src = src
		}
	}
}

module.exports.ImagePlugin = ImagePlugin
module.exports.Image = Image
