const operationTypes = {
	CUT: 'cut',
	APPEND: 'append',
	PRECONNECT: 'preconnect',
	CONNECT: 'connect'
}

class TimeTravel {
	constructor(selection) {
		this.onSelectionChange = this.onSelectionChange.bind(this)
		this.commit = this.commit.bind(this)

		this.timeline = []
		this.timeindex = -1
		this.isLockPushChange = false
		this.currentBunch = []
		this.timer = null
		this.selection = selection
		this.previousSelection = null
		this.preservedPreviousSelection = false
	}

	onSelectionChange(selection) {
		if (!this.preservedPreviousSelection) {
			this.previousSelection = selection.getSelectionInIndexes()
		}
	}

	pushChange(event) {
		if (!this.isLockPushChange) {
			if (this.timer !== null) {
				clearTimeout(this.timer)
			}

			this.currentBunch.push(event)
			this.timer = setTimeout(this.commit, 100)
		}
	}

	commit() {
		if (this.timer !== null) {
			clearTimeout(this.timer)
		}

		if (this.timeindex < this.timeline.length - 1) {
			this.timeline.splice(this.timeindex + 1)
		}

		this.timeline.push({
			bunch: this.currentBunch,
			previousSelection: this.previousSelection,
			nextSelection: this.selection.getSelectionInIndexes()
		})
		this.currentBunch = []
		this.preservedPreviousSelection = false
		this.previousSelection = null
		this.timeindex++
		this.timer = null
	}

	goBack() {
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
							previousEvent.next.preconnect(previousEvent.target)
						} else {
							previousEvent.container.append(previousEvent.target)
						}

						break
					case operationTypes.APPEND:
						previousEvent.target.cutUntil(previousEvent.last)

						break
					case operationTypes.PRECONNECT:
						previousEvent.target.cutUntil(previousEvent.last)

						break
					case operationTypes.CONNECT:
						previousEvent.target.cutUntil(previousEvent.last)

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
						nextEvent.target.cutUntil(nextEvent.next)
						break
					case operationTypes.APPEND:
						nextEvent.container.append(nextEvent.target)
						break
					case operationTypes.PRECONNECT:
						nextEvent.next.preconnect(nextEvent.target)
						break
					case operationTypes.CONNECT:
						nextEvent.previous.connect(nextEvent.target)
						break
				}
			}

			this.selection.setSelectionByIndexes(selectionIndexes)
			this.isLockPushChange = false
			this.timeindex++
		}
	}

	preservePreviousSelection() {
		this.preservedPreviousSelection = true
	}
}

module.exports = {
	TimeTravel,
	operationTypes
}
