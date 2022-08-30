import WithControls from './with-controls'

export default class InlineWidget extends WithControls {
	constructor(type, attributes = {}) {
		super(type, attributes)

		this.isInlineWidget = true
	}
}
