const WithControls = require('./with-controls')

class InlineWidget extends WithControls {
	constructor(type, attributes = {}) {
		super(type, attributes)

		this.isInlineWidget = true
	}
}

module.exports = InlineWidget
