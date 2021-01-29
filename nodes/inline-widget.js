const WithControls = require('./with-controls')

class InlineWidget extends WithControls {
	constructor(core, type) {
		super(core, type)

		this.isInlineWidget = true
	}
}

module.exports = InlineWidget
