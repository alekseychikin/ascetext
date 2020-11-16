const PluginPlugin = require('./plugin')
const Section = require('../nodes/section')
const Widget = require('../nodes/widget')
const ControlButton = require('../controls/button')
const Paragraph = require('./paragraph').Paragraph
const createElement = require('../create-element')

class Columns extends Widget {
	setSecondColumnData() {
		if (this.types[1] !== 'data') {
			const columnData = new ColumnData()

			this.types[1] = 'data'
			columnData.append(new Paragraph())
			this.last.replaceWith(columnData)
		}
	}

	setSecondColumnImage() {
		if (this.types[1] !== 'image') {
			const columnImage = new ColumnImage('', this.params)

			this.types[1] = 'image'
			this.last.replaceWith(columnImage)
		}
	}

	constructor(types, params) {
		super('columns')

		this.setSecondColumnData = this.setSecondColumnData.bind(this)
		this.setSecondColumnImage = this.setSecondColumnImage.bind(this)

		this.types = types
		this.params = params
		this.controls = [
			new ControlButton({
				label: 'Картинка и текст',
				icon: 'columns-data',
				selected: (columns) => columns.types[1] === 'data',
				action: this.setSecondColumnData
			}),
			new ControlButton({
				label: 'Две картинки',
				icon: 'columns-image',
				selected: (columns) => columns.types[1] === 'image',
				action: this.setSecondColumnImage
			})
		]
		this.setElement(createElement('div', {
			'class': 'columns columns-edit',
			contenteditable: false,
			tabIndex: 0
		}))
	}

	stringify(children) {
		return '<div class="columns">' + children + '</div>'
	}
}

class ColumnData extends Section {
	constructor() {
		super('column-data')

		this.setElement(createElement('div', {
			'class': 'column column--data',
			contenteditable: true
		}))
	}

	stringify(children) {
		return '<div class="column column--data">' + children + '</div>'
	}
}

class ColumnImage extends Widget {
	constructor(src, params) {
		super('column-image')

		this.onInputFileChange = this.onInputFileChange.bind(this)
		this.updateControlPosition = this.updateControlPosition.bind(this)

		this.src = src
		this.params = params
		this.setElement(createElement('img', {
			tabIndex: 0,
			src: this.src,
			'class': 'content-columns__image'
		}))
	}

	onFocus(selection) {
		if (this.src.length) {
			this.selection = selection
			this.createControl()
			this.updateControlPosition()
		}
	}

	onBlur() {
		if (this.src.length && this.control) {
			this.removeControl()
		}
	}

	onDelete() {
		this.removeControl()
	}

	async onInputFileChange(event) {
		const { files } = event.target

		if (files.length) {
			const src = await this.params.onSelectFile(files[0])

			this.src = (this.params.dir || '') + src
			this.element.src = (this.params.dir || '') + src

			this.updateControlPosition()

			if (!this.isFocused) {
				this.removeControl()
			}
		}
	}

	createControl() {
		const content = document.createElement('span')

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
			this.selection.removePluginControl(this.control)

			delete this.input
			delete this.control
		}

		this.removeResizeEventListener(this.updateControlPosition)
	}

	updateControlPosition() {
		setTimeout(() => {
			if (this.control) {
				const scrollTop = document.body.scrollTop || document.documentElement.scrollTop
				const containerBoundingClientRect = this.element.getBoundingClientRect()

				this.control.style.top = containerBoundingClientRect.top + scrollTop + 'px'
				this.control.style.left = containerBoundingClientRect.left + 'px'
				this.control.style.width = this.element.offsetWidth + 'px'
				this.control.style.height = this.element.offsetHeight + 'px'
			}
		}, 1)
	}

	stringify() {
		return '<img class="content-columns__image" src="' + this.src + '" />'
	}
}

class ColumnsPlugin extends PluginPlugin {
	constructor(params) {
		super()

		this.setColumns = this.setColumns.bind(this)

		this.params = params
	}

	parse(element, parse, context) {
		if (element.nodeType === 1 && element.nodeName.toLowerCase() === 'div' && element.className === 'columns') {
			const columnElements = Array.from(element.childNodes).filter((child) =>
				child.nodeType === 1 && child.nodeName.toLowerCase() === 'div' && child.classList.contains('column')
			)
			const types = columnElements.map((element) =>
				element.classList.contains('column--image') ? 'image' : 'data'
			)

			const columns = new Columns(types)

			columnElements.forEach((columnElement) => {
				let children

				if (columnElement.classList.contains('column--image')) {
					const imgChild = columnElement.querySelector('img')
					const columnImage = new ColumnImage(imgChild.src, this.params)

					columns.append(columnImage)
				} else if (
					children = parse(
						columnElement.firstChild,
						columnElement.lastChild,
						context
					)
				) {
					const columnData = new ColumnData()

					columnData.append(children)
					columns.append(columnData)
				}
			})

			return columns
		}

		return false
	}

	getInsertControls(container) {
		if (container.parent.type === 'root') {
			return [ new ControlButton({
				label: 'Добавить колонки',
				icon: 'image-left',
				action: this.setColumns
			}) ]
		}

		return []
	}

	setColumns(event, selection) {
		const columns = new Columns([ 'image', 'data' ], this.params)
		const columnImage = new ColumnImage('', this.params)
		const columnData = new ColumnData()

		columnData.append(new Paragraph())
		columns.append(columnImage)
		columns.append(columnData)
		selection.anchorContainer.replaceWith(columns, selection.anchorContainer.next)
		selection.restoreSelection()
	}
}

module.exports.ColumnsPlugin = ColumnsPlugin
