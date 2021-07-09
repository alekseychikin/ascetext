const WithControls = require('./with-controls')

class InlineWidget extends WithControls {
	constructor(type) {
		super(type)

		this.isInlineWidget = true
	}
}

module.exports = InlineWidget
