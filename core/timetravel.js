const operationTypes = {
	CUT: 'cut',
	APPEND: 'append',
	PRECONNECT: 'preconnect',
	CONNECT: 'connect'
}

class TimeTravel {
	constructor(selection, builder) {
		this.onSelectionChange = this.onSelectionChange.bind(this)
		this.commit = this.commit.bind(this)

		this.timeline = []
		this.timeindex = -1
		this.isLockPushChange = true
		this.currentBunch = []
		this.pushChangeTimer = null
		this.commitTimer = null
		this.builder = builder
		this.selection = selection
		this.previousSelection = null
		this.preservedPreviousSelection = false
	}

	begin() {
		this.isLockPushChange = false
	}

	onSelectionChange(selection) {
		if (!this.preservedPreviousSelection) {
			this.previousSelection = selection.getSelectionInIndexes()
		}
	}

	preservePreviousSelection() {
		this.preservedPreviousSelection = true
	}

	pushChange(event) {
		if (!this.isLockPushChange) {
			if (this.pushChangeTimer !== null) {
				clearTimeout(this.pushChangeTimer)
			}

			this.currentBunch.push(event)
			this.pushChangeTimer = setTimeout(this.commit, 100)
		}
	}

	commit() {
		if (!this.currentBunch.length) {
			return
		}

		const nextSelection = this.selection.getSelectionInIndexes()

		if (this.pushChangeTimer !== null) {
			clearTimeout(this.pushChangeTimer)
		}

		if (this.timeindex < this.timeline.length - 1) {
			this.timeline.splice(this.timeindex + 1)
		}

		this.timeline.push({
			bunch: this.currentBunch,
			previousSelection: this.previousSelection,
			nextSelection
		})
		this.currentBunch = []
		this.preservedPreviousSelection = false
		this.previousSelection = nextSelection
		this.timeindex++
		this.pushChangeTimer = null
	}

	goBack() {
		// debugger
		if (this.timeindex > -1) {
			const {
				bunch: previousEvents,
				previousSelection: selectionIndexes
			} = this.timeline[this.timeindex]
			let i = previousEvents.length - 1
			let previousEvent = null

			this.isLockPushChange = true

			for (; i >= 0; i--) {
				previousEvent = previousEvents[i]

				switch (previousEvent.type) {
					case operationTypes.CUT:
						if (previousEvent.next) {
							this.builder.preconnect(previousEvent.next, previousEvent.target)
						} else if (previousEvent.previous) {
							this.builder.connect(previousEvent.previous, previousEvent.target)
						} else if (previousEvent.container) {
							this.builder.append(previousEvent.container, previousEvent.target)
						}

						break
					case operationTypes.APPEND:
					case operationTypes.PRECONNECT:
					case operationTypes.CONNECT:
						this.builder.cutUntil(previousEvent.target, previousEvent.last)

						break
				}
			}

			this.selection.setSelectionByIndexes(selectionIndexes)
			this.isLockPushChange = false
			this.timeindex--
		}
	}

	goForward() {
		if (this.timeindex < this.timeline.length - 1) {
			const {
				bunch: nextEvents,
				nextSelection: selectionIndexes
			} = this.timeline[this.timeindex + 1]
			let nextEvent = null
			let i = 0

			this.isLockPushChange = true

			for (; i < nextEvents.length; i++) {
				nextEvent = nextEvents[i]

				switch (nextEvent.type) {
					case operationTypes.CUT:
						this.builder.cutUntil(nextEvent.target, nextEvent.until)
						break
					case operationTypes.APPEND:
						this.builder.append(nextEvent.container, nextEvent.target)
						break
					case operationTypes.PRECONNECT:
						this.builder.preconnect(nextEvent.next, nextEvent.target)
						break
					case operationTypes.CONNECT:
						this.builder.connect(nextEvent.previous, nextEvent.target)
						break
				}
			}

			this.selection.setSelectionByIndexes(selectionIndexes)
			this.isLockPushChange = false
			this.timeindex++
		}
	}
}

module.exports = {
	TimeTravel,
	operationTypes
}
