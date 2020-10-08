import WithControls from './with-controls'

export default class InlineWidget extends WithControls {
	constructor(type) {
		super(type)

		this.isInlineWidget = true
	}
}
