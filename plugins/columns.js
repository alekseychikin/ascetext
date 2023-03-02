import PluginPlugin from './plugin.js'
import Section from '../nodes/section.js'
import Widget from '../nodes/widget.js'
import ControlButton from '../controls/button.js'
import createElement from '../utils/create-element.js'
import isHtmlElement from '../utils/is-html-element.js'

export class Columns extends Widget {
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

	setSecondColumnData({ builder }) {
		if (this.types[1] !== 'data') {
			const columnData = new ColumnData()

			this.types[1] = 'data'
			builder.append(columnData, builder.createBlock())
			builder.replace(this.last, columnData)
		}
	}

	setSecondColumnImage({ builder }) {
		if (this.types[1] !== 'image') {
			const columnImage = new ColumnImage('', this.params)

			this.types[1] = 'image'
			builder.replace(this.last, columnImage)
		}
	}

	stringify(children) {
		return '<div class="columns">' + children + '</div>'
	}
}

export class ColumnData extends Section {
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

export class ColumnImage extends Widget {
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

export default class ColumnsPlugin extends PluginPlugin {
	constructor(params) {
		super()

		this.setColumns = this.setColumns.bind(this)

		this.params = params
	}

	create(types) {
		return new Columns(types)
	}

	parse(element, builder, context) {
		if (isHtmlElement(element) && element.matches('div.columns')) {
			const columnElements = Array.from(element.childNodes).filter((child) =>
				isHtmlElement(child) && child.matches('div.column')
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

					builder.append(columns, columnImage)
				} else if (
					children = builder.parse(columnElement, context)
				) {
					const columnData = new ColumnData()

					builder.append(columnData, children)
					builder.append(columns, columnData)
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

	setColumns(event, { builder, anchorContainer }) {
		const columns = new Columns([ 'image', 'data' ], this.params)
		const columnImage = new ColumnImage('', this.params)
		const columnData = new ColumnData()

		columnData.append(builder.createBlock())
		columns.append(columnImage)
		columns.append(columnData)
		builder.replace(anchorContainer, columns)
	}
}
