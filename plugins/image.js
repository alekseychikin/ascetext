const Widget = require('../nodes/widget')
const Container = require('../nodes/container')
const Paragraph = require('../plugins/paragraph').Paragraph
const PluginPlugin = require('./plugin')
const ControlButton = require('../controls/button')
const ControlFile = require('../controls/file')
const createElement = require('../create-element')

class Image extends Widget {
	toggleFloatLeft() {
		this.size = ''
		this.float = this.float === 'left' ? 'none' : 'left'
		this.element.className = this.getClassName()
		this.updateControlPosition()
	}

	toggleFloatRight() {
		this.size = ''
		this.float = this.float === 'right' ? 'none' : 'right'
		this.element.className = this.getClassName()
		this.updateControlPosition()
	}

	toggleSizeWide() {
		this.float = 'none'
		this.size = this.size === 'wide' ? '' : 'wide'
		this.element.className = this.getClassName()
		this.updateControlPosition()
	}

	toggleSizeBanner() {
		this.float = 'none'
		this.size = this.size === 'banner' ? '' : 'banner'
		this.element.className = this.getClassName()
		this.updateControlPosition()
	}

	constructor(src, size, float, params) {
		super('image')

		this.toggleFloatLeft = this.toggleFloatLeft.bind(this)
		this.toggleFloatRight = this.toggleFloatRight.bind(this)
		this.toggleSizeWide = this.toggleSizeWide.bind(this)
		this.toggleSizeBanner = this.toggleSizeBanner.bind(this)
		this.onInputFileChange = this.onInputFileChange.bind(this)
		this.updateControlPosition = this.updateControlPosition.bind(this)

		this.fields = [ 'size', 'float' ]
		this.src = src
		this.size = size || ''
		this.float = float || 'none'
		this.params = params

		this.controls = [
			new ControlButton({
				label: 'Обтекание справа',
				icon: 'image-left',
				selected: (image) => image.float === 'left',
				action: this.toggleFloatLeft
			}),
			new ControlButton({
				label: 'Обтекание слева',
				icon: 'image-right',
				selected: (image) => image.float === 'right',
				action: this.toggleFloatRight
			}),
			new ControlButton({
				label: 'Широкая картинка',
				icon: 'image-wide',
				selected: (image) => image.size === 'wide',
				action: this.toggleSizeWide
			}),
			new ControlButton({
				label: 'Банер',
				icon: 'image-banner',
				selected: (image) => image.size === 'banner',
				action: this.toggleSizeBanner
			})
		]
		this.image = createElement('img', {
			src: this.src
		})
		this.setElement(createElement('figure', {
			'class': this.getClassName(),
			contenteditable: false,
			tabIndex: 0
		}, [ this.image ]))
	}

	getClassName() {
		const classNames = [ 'content-image' ]

		if (this.size.length) {
			classNames.push(`content-image--size-${this.size}`)
		}

		if (this.float !== 'none') {
			classNames.push(`content-image--float-${this.float}`)
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
		this.control.className = 'content-columns__image-control'
		this.input.type = 'file'
		this.input.className = 'content-columns__image-control-input'
		content.appendChild(document.createTextNode('Загрузить фотографию'))
		this.control.appendChild(content)
		this.control.appendChild(this.input)
		document.body.appendChild(this.control)
		this.input.addEventListener('change', this.onInputFileChange)
		this.addResizeEventListener(this.updateControlPosition)
		// this.selection.addPluginControl(this.control)
	}

	removeControl() {
		if (this.control) {
			this.input.removeEventListener('change', this.onInputFileChange)
			this.control.parentNode.removeChild(this.control)
			// this.selection.removePluginControl(this.control)

			delete this.input
			delete this.control
		}

		this.removeResizeEventListener(this.updateControlPosition)
	}

	updateControlPosition() {
		setTimeout(() => {
			if (this.control) {
				console.log(this.image)
				// const scrollTop = document.body.scrollTop || document.documentElement.scrollTop
				// const imageBoundingClientRect = this.image.getBoundingClientRect()

				// this.control.style.top = imageBoundingClientRect.top + scrollTop + 'px'
				// this.control.style.left = imageBoundingClientRect.left + 'px'
				// this.control.style.width = this.image.offsetWidth + 'px'
				// this.control.style.height = this.image.offsetHeight + 'px'
			}
		}, 1)
	}

	stringify(children) {
		const classNames = [ 'content-image' ]

		if (children.length) {
			classNames.push('content-image--with-caption')
		}

		if (this.size.length) {
			classNames.push(`content-image--size-${this.size}`)
		}

		if (this.float !== 'none') {
			classNames.push(`content-image--float-${this.float}`)
		}

		return '<figure class="' + classNames.join(' ') + '"><img src="' + this.src + '" />' + children + '</figure>'
	}
}

class ImageCaption extends Container {
	constructor() {
		super('image-caption')

		this.setElement(createElement('figcaption', {
			contenteditable: true
		}))
	}

	enterHandler(event, core) {
		const emptyParagraph = new Paragraph()

		this.parent.connect(emptyParagraph)
		core.selection.setSelection(emptyParagraph.element, 0)
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

		this.insertImage = this.insertImage.bind(this)

		this.params = params
	}

	match(element) {
		if (element.nodeType === 1 && element.nodeName.toLowerCase() === 'figure' && element.className.indexOf('content-image') > -1) {
			return true
		}

		return false
	}

	parse(element, parse, context) {
		if (element.nodeType === 1 && element.nodeName.toLowerCase() === 'figure' && element.className.indexOf('content-image') > -1) {
			const classNames = element.className.split(/\s+/)
			let size = ''
			let float = 'none'

			classNames.forEach((className) => {
				const sizeMatched = className.match(/content-image--size-(.*)/)
				const floatMatched = className.match(/content-image--float-(.*)/)

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
				: null
			const image = new Image(imgElement.src, size, float, this.params)
			const caption = new ImageCaption()

			if (captionChildren) {
				caption.append(captionChildren)
			}

			image.append(caption)

			return image
		}

		return false
	}

	getInsertControls(container) {
		if (container.parent.type === 'root') {
			return [
				new ControlFile({
					label: 'Вставить картинку',
					icon: 'image',
					action: this.insertImage
				})
			]
		}

		return []
	}

	async insertImage(event, selection) {
		const { files } = event.target

		if (files.length) {
			const src = await this.params.onSelectFile(files[0])
			const image = new Image((this.params.dir || '') + src, '', 'none', this.params)
			const caption = new ImageCaption()

			image.append(caption)
			selection.anchorContainer.replaceWith(image, selection.anchorContainer.next)
			selection.restoreSelection()
		}
	}
}

module.exports.ImagePlugin = ImagePlugin
module.exports.Image = Image
