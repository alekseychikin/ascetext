import PluginPlugin from './plugin'
import Container from '../nodes/container'
import createElement from '../utils/create-element'

export class Header extends Container {
	constructor(attributes) {
		super('header', attributes)

		this.setElement(createElement(`h${attributes.level}`))
	}

	stringify(children) {
		return '<h' + this.attributes.level + '>' + children + '</h' + this.attributes.level + '>'
	}

	json(children) {
		return {
			type: this.type,
			level: this.attributes.level,
			body: children
		}
	}
}

export default class HeaderPlugin extends PluginPlugin {
	constructor(params = {}) {
		super()

		this.params = Object.assign({
			allowLevels: [2, 3, 4]
		}, params)
		this.supportHeaders = this.params.allowLevels.map((level) => `h${level}`)
	}

	get icons() {
		return {
			h2: '<svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M3.23047 6.42773C3.71094 5.83789 4.33594 5.54297 5.10547 5.54297C6.44531 5.54297 7.12109 6.29883 7.13281 7.81055V12H6.04883V7.80469C6.04492 7.34766 5.93945 7.00977 5.73242 6.79102C5.5293 6.57227 5.21094 6.46289 4.77734 6.46289C4.42578 6.46289 4.11719 6.55664 3.85156 6.74414C3.58594 6.93164 3.37891 7.17773 3.23047 7.48242V12H2.14648V3H3.23047V6.42773Z" fill="currentColor"/>\
<path d="M14.2344 12H8.64453V11.2207L11.5977 7.93945C12.0352 7.44336 12.3359 7.04102 12.5 6.73242C12.668 6.41992 12.752 6.09766 12.752 5.76562C12.752 5.32031 12.6172 4.95508 12.3477 4.66992C12.0781 4.38477 11.7188 4.24219 11.2695 4.24219C10.7305 4.24219 10.3105 4.39648 10.0098 4.70508C9.71289 5.00977 9.56445 5.43555 9.56445 5.98242H8.48047C8.48047 5.19727 8.73242 4.5625 9.23633 4.07812C9.74414 3.59375 10.4219 3.35156 11.2695 3.35156C12.0625 3.35156 12.6895 3.56055 13.1504 3.97852C13.6113 4.39258 13.8418 4.94531 13.8418 5.63672C13.8418 6.47656 13.3066 7.47656 12.2363 8.63672L9.95117 11.1152H14.2344V12Z" fill="currentColor"/>\
</svg>',
			h3: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M4.8457 9.6416C5.56641 8.75684 6.50391 8.31445 7.6582 8.31445C9.66797 8.31445 10.6816 9.44824 10.6992 11.7158V18H9.07324V11.707C9.06738 11.0215 8.90918 10.5146 8.59863 10.1865C8.29395 9.8584 7.81641 9.69434 7.16602 9.69434C6.63867 9.69434 6.17578 9.83496 5.77734 10.1162C5.37891 10.3975 5.06836 10.7666 4.8457 11.2236V18H3.21973V4.5H4.8457V9.6416Z" fill="currentColor"/>\
<path d="M15.3311 10.8105H16.5527C17.3203 10.7988 17.9238 10.5967 18.3633 10.2041C18.8027 9.81152 19.0225 9.28125 19.0225 8.61328C19.0225 7.11328 18.2754 6.36328 16.7812 6.36328C16.0781 6.36328 15.5156 6.56543 15.0938 6.96973C14.6777 7.36816 14.4697 7.89844 14.4697 8.56055H12.8438C12.8438 7.54688 13.2129 6.70605 13.9512 6.03809C14.6953 5.36426 15.6387 5.02734 16.7812 5.02734C17.9883 5.02734 18.9346 5.34668 19.6201 5.98535C20.3057 6.62402 20.6484 7.51172 20.6484 8.64844C20.6484 9.20508 20.4668 9.74414 20.1035 10.2656C19.7461 10.7871 19.2568 11.1768 18.6357 11.4346C19.3389 11.6572 19.8809 12.0264 20.2617 12.542C20.6484 13.0576 20.8418 13.6875 20.8418 14.4316C20.8418 15.5801 20.4668 16.4912 19.7168 17.165C18.9668 17.8389 17.9912 18.1758 16.79 18.1758C15.5889 18.1758 14.6104 17.8506 13.8545 17.2002C13.1045 16.5498 12.7295 15.6914 12.7295 14.625H14.3643C14.3643 15.2988 14.584 15.8379 15.0234 16.2422C15.4629 16.6465 16.0518 16.8486 16.79 16.8486C17.5752 16.8486 18.1758 16.6436 18.5918 16.2334C19.0078 15.8232 19.2158 15.2344 19.2158 14.4668C19.2158 13.7227 18.9873 13.1514 18.5303 12.7529C18.0732 12.3545 17.4141 12.1494 16.5527 12.1377H15.3311V10.8105Z" fill="currentColor"/>\
</svg>',
			h4: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">\
<path d="M4.8457 9.6416C5.56641 8.75684 6.50391 8.31445 7.6582 8.31445C9.66797 8.31445 10.6816 9.44824 10.6992 11.7158V18H9.07324V11.707C9.06738 11.0215 8.90918 10.5146 8.59863 10.1865C8.29395 9.8584 7.81641 9.69434 7.16602 9.69434C6.63867 9.69434 6.17578 9.83496 5.77734 10.1162C5.37891 10.3975 5.06836 10.7666 4.8457 11.2236V18H3.21973V4.5H4.8457V9.6416Z" fill="currentColor"/>\
<path d="M19.8311 13.7021H21.6064V15.0293H19.8311V18H18.1963V15.0293H12.3691V14.0713L18.0996 5.20312H19.8311V13.7021ZM14.2148 13.7021H18.1963V7.42676L18.0029 7.77832L14.2148 13.7021Z" fill="currentColor"/>\
</svg>'
		}
	}

	create({ level }) {
		return new Header({ level })
	}

	parse(element, builder, context) {
		if (element.nodeType === 1 && this.supportHeaders.includes(element.nodeName.toLowerCase())) {
			const matches = element.nodeName.toLowerCase().match(/(?<level>\d)+/)
			const node = builder.create('header', { level: Number(matches.groups.level) })
			let children

			if (children = builder.parse(element, context)) {
				builder.append(node, children)
			}

			return node
		}

		return false
	}

	parseJson(element, builder) {
		if (element.type === 'header') {
			const node = builder.create('header', { level: element.level })
			let children

			if (children = builder.parseJson(element.body)) {
				builder.append(node, children)
			}
			return node
		}

		return false
	}

	setHeader(level) {
		return (event, { builder, anchorContainer }) => {
			if (anchorContainer.type !== 'header' || anchorContainer.level !== level) {
				const header = builder.create('header', { level })

				builder.append(header, anchorContainer.first)
				builder.replace(anchorContainer, header)
			}
		}
	}

	getInsertControls(container) {
		if (!container.parent.isSection) {
			return []
		}

		const controls = this.params.allowLevels
			.filter((level) => level !== container.attributes.level)
			.map((level) =>
				({
					slug: `header.h${level}`,
					label: 'Сделать заголовком',
					icon: `h${level}`,
					action: this.setHeader(level)
				})
			)

		return controls
	}

	getReplaceControls(container) {
		if (!container.parent.isSection || !container.isContainer) {
			return []
		}

		const controls = this.params.allowLevels
			.filter((level) => level !== container.attributes.level)
			.map((level) =>
				({
					slug: `header.h${level}`,
					label: 'Сделать заголовком',
					icon: `h${level}`,
					action: this.setHeader(level)
				})
			)

		return controls
	}
}
