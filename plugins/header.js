import PluginPlugin from './plugin.js'
import Container from '../nodes/container.js'

export class Header extends Container {
	constructor(attributes) {
		super('header', attributes)
	}

	render(body) {
		return {
			type: `h${this.attributes.level}`,
			attributes: {},
			body
		}
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
	get register() {
		return {
			'header': Header
		}
	}

	constructor(params = {}) {
		super()

		this.params = Object.assign({
			allowLevels: [2, 3, 4]
		}, params)
		this.supportHeaders = this.params.allowLevels.map((level) => `h${level}`)
	}

	get icons() {
		return {
			h1: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.684 9.051a1 1 0 1 0 .632 1.898l-.632-1.898ZM19 9h1a1 1 0 0 0-1.316-.949L19 9Zm-1 10a1 1 0 1 0 2 0h-2ZM4 5a1 1 0 0 0-2 0h2ZM2 19a1 1 0 1 0 2 0H2ZM12 5a1 1 0 1 0-2 0h2Zm-2 14a1 1 0 1 0 2 0h-2Zm6.316-8.051 3-1-.632-1.898-3 1 .632 1.898ZM18 9v10h2V9h-2ZM2 5v7h2V5H2Zm2 14v-7H2v7h2Zm6-14v7h2V5h-2Zm2 14v-7h-2v7h2Zm-9-6h8v-2H3v2Z" fill="currentColor"/></svg>',
			h2: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 12.5a1 1 0 1 0 2 0h-2Zm6.172 1.328.707.708-.707-.708ZM15 19l-.707-.707A1 1 0 0 0 15 20v-1Zm6 1a1 1 0 1 0 0-2v2ZM4 5a1 1 0 0 0-2 0h2ZM2 19a1 1 0 1 0 2 0H2ZM12 5a1 1 0 1 0-2 0h2Zm-2 14a1 1 0 1 0 2 0h-2Zm6-6.5V12h-2v.5h2Zm2-2.5h.172V8H18v2Zm1.465 3.121-5.172 5.172 1.414 1.414 5.172-5.171-1.415-1.415ZM15 20h6v-2h-6v2Zm5-8.172c0 .486-.193.95-.535 1.293l1.414 1.415a3.828 3.828 0 0 0 1.12-2.708h-2ZM18.172 10c1.01 0 1.828.819 1.828 1.828h2A3.828 3.828 0 0 0 18.172 8v2ZM16 12a2 2 0 0 1 2-2V8a4 4 0 0 0-4 4h2ZM2 5v7h2V5H2Zm2 14v-7H2v7h2Zm6-14v7h2V5h-2Zm2 14v-7h-2v7h2Zm-9-6h8v-2H3v2Z" fill="currentColor"/></svg>',
			h3: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 8a1 1 0 1 0 0 2V8Zm6 1 .707.707A1 1 0 0 0 21 8v1Zm-4 4-.707-.707A1 1 0 0 0 17 14v-1Zm-.886 3.666a1 1 0 1 0-1.886.665l1.886-.665ZM4 5a1 1 0 0 0-2 0h2ZM2 19a1 1 0 1 0 2 0H2ZM12 5a1 1 0 1 0-2 0h2Zm-2 14a1 1 0 1 0 2 0h-2Zm5-9h6V8h-6v2Zm5.293-1.707-4 4 1.414 1.414 4-4-1.414-1.414ZM17 14h1v-2h-1v2Zm1 0a2 2 0 0 1 2 2h2a4 4 0 0 0-4-4v2Zm2 2a2 2 0 0 1-2 2v2a4 4 0 0 0 4-4h-2Zm-2 2a2 2 0 0 1-1.155-.367l-1.155 1.632A4 4 0 0 0 18 20v-2Zm-1.155-.367a2 2 0 0 1-.731-.967l-1.886.665a4 4 0 0 0 1.462 1.934l1.155-1.632ZM2 5v7h2V5H2Zm2 14v-7H2v7h2Zm6-14v7h2V5h-2Zm2 14v-7h-2v7h2Zm-9-6h8v-2H3v2Z" fill="currentColor"/></svg>',
			h4: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18.954 9.298a1 1 0 0 0-1.909-.596l1.91.596ZM15.5 17l-.954-.298A1 1 0 0 0 15.5 18v-1Zm5.5 1a1 1 0 1 0 0-2v2Zm0-4a1 1 0 1 0-2 0h2Zm-2 5a1 1 0 1 0 2 0h-2ZM4 5a1 1 0 0 0-2 0h2ZM2 19a1 1 0 1 0 2 0H2ZM12 5a1 1 0 1 0-2 0h2Zm-2 14a1 1 0 1 0 2 0h-2Zm7.046-10.298-2.5 8 1.909.596 2.5-8-1.91-.596ZM15.5 18H21v-2h-5.5v2Zm3.5-4v5h2v-5h-2ZM2 5v7h2V5H2Zm2 14v-7H2v7h2Zm6-14v7h2V5h-2Zm2 14v-7h-2v7h2Zm-9-6h8v-2H3v2Z" fill="currentColor"/></svg>',
			h5: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 10a1 1 0 1 0 0-2v2Zm-4-1V8a1 1 0 0 0-.97.758L17 9Zm-1.25 5.016-.97-.242a1 1 0 0 0 1.72.903l-.75-.661Zm.25-.252.667.745-.667-.745Zm1.235-.665-.255-.967.255.967Zm2.07.2.435-.9-.435.9ZM16.5 17.323a1 1 0 1 0-1.5 1.323l1.5-1.323ZM4 5a1 1 0 0 0-2 0h2ZM2 19a1 1 0 1 0 2 0H2ZM12 5a1 1 0 1 0-2 0h2Zm-2 14a1 1 0 1 0 2 0h-2ZM21 8h-4v2h4V8Zm-4.97.758-1.25 5.016 1.94.484 1.25-5.016-1.94-.484Zm.47 5.92c.052-.06.108-.116.167-.169l-1.334-1.49a3.987 3.987 0 0 0-.333.335l1.5 1.323Zm.167-.169a2 2 0 0 1 .823-.443l-.51-1.934a4 4 0 0 0-1.647.887l1.334 1.49Zm.823-.443a2 2 0 0 1 1.38.133l.87-1.8a4 4 0 0 0-2.76-.267l.51 1.934Zm1.38.133c.43.207.77.561.962.998l1.832-.802a4 4 0 0 0-1.924-1.997l-.87 1.801Zm.962.998a2 2 0 0 1 .082 1.385l1.913.581a4 4 0 0 0-.163-2.768l-1.832.803Zm.082 1.385a2 2 0 0 1-.838 1.104l1.075 1.686a4 4 0 0 0 1.676-2.209l-1.913-.581Zm-.838 1.104a2 2 0 0 1-1.355.294l-.28 1.98a4 4 0 0 0 2.71-.588l-1.075-1.686Zm-1.355.294a2 2 0 0 1-1.221-.657L15 18.646a4 4 0 0 0 2.441 1.315l.28-1.98ZM2 5v7h2V5H2Zm2 14v-7H2v7h2Zm6-14v7h2V5h-2Zm2 14v-7h-2v7h2Zm-9-6h8v-2H3v2Z" fill="currentColor"/></svg>',
			h6: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m19.5 13.433-.497.867.497-.867Zm.376-4.95a1 1 0 1 0-1.752-.966l1.752.966ZM4 5a1 1 0 0 0-2 0h2ZM2 19a1 1 0 1 0 2 0H2ZM12 5a1 1 0 1 0-2 0h2Zm-2 14a1 1 0 1 0 2 0h-2Zm9.734-1.994a2.01 2.01 0 0 1-2.736.727l-.995 1.734a4.01 4.01 0 0 0 5.46-1.457l-1.73-1.004Zm-2.736.727a1.974 1.974 0 0 1-.73-2.706l-1.73-1.004a3.974 3.974 0 0 0 1.465 5.444l.995-1.734Zm-.73-2.706a2.01 2.01 0 0 1 2.735-.727l.995-1.734a4.01 4.01 0 0 0-5.46 1.457l1.73 1.004Zm2.735-.727c.956.55 1.28 1.76.73 2.706l1.73 1.004a3.974 3.974 0 0 0-1.465-5.444l-.995 1.734Zm-2.725.708 3.598-6.525-1.752-.966-3.597 6.525 1.751.966ZM2 5v7h2V5H2Zm2 14v-7H2v7h2Zm6-14v7h2V5h-2Zm2 14v-7h-2v7h2Zm-9-6h8v-2H3v2Z" fill="currentColor"/></svg>'
		}
	}

	parse(element, builder) {
		if (element.nodeType === 1 && this.supportHeaders.includes(element.nodeName.toLowerCase())) {
			const matches = element.nodeName.toLowerCase().match(/(?<level>\d)+/)

			return builder.create('header', { level: Number(matches.groups.level) })
		}
	}

	parseJson(element, builder) {
		if (element.type === 'header') {
			return builder.create('header', { level: element.level })
		}

		return false
	}

	parseTreeElement(element, builder) {
		if (this.supportHeaders.includes(element.type)) {
			const matches = element.type.toLowerCase().match(/(?<level>\d)+/)

			return builder.create('header', { level: Number(matches.groups.level) })
		}
	}

	setHeader(level) {
		return (event, { builder, focusedNodes }) => {
			focusedNodes.forEach((item) => {
				if (item.isContainer && item.parent.isSection && (item.type !== 'header' || item.level !== level)) {
					const header = builder.create('header', { level })

					builder.append(header, item.first)
					builder.replace(item, header)
				}
			})
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
					label: `Header ${level}`,
					icon: `h${level}`,
					action: this.setHeader(level)
				})
			)

		return controls
	}

	getReplaceControls(focusedNodes) {
		const containers = focusedNodes.filter((node) => node.isContainer && node.parent.isSection)
		const headers = containers.filter((node) => node.type === 'header')
		const headerLevels = headers.map((header) => header.attributes.level)

		if (!containers.length) {
			return []
		}

		const controls = this.params.allowLevels
			.map((level) =>
				({
					slug: `header.h${level}`,
					label: `Header ${level}`,
					icon: `h${level}`,
					selected: headerLevels.includes(level),
					action: this.setHeader(level)
				})
			)

		return controls
	}
}
