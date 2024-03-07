export const operationTypes = {
	CUT: 'cut',
	APPEND: 'append',
	ATTRIBUTE: 'attribute'
}

export default class TimeTravel {
	constructor(selection, builder, root) {
		this.onSelectionChange = this.onSelectionChange.bind(this)
		this.commit = this.commit.bind(this)

		this.timeline = []
		this.timeindex = -1
		this.isLockPushChange = true
		this.currentBunch = []
		this.root = root
		this.builder = builder
		this.selection = selection
		this.previousSelection = null
		this.preservedPreviousSelection = false

		this.selection.onUpdate(this.onSelectionChange)
	}

	reset() {
		this.timeline = []
		this.currentBunch = []
		this.timeindex = -1
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

	pushChange(change) {
		if (!this.isLockPushChange) {
			let payload

			switch (change.type) {
				case operationTypes.ATTRIBUTE:
					this.currentBunch.push({
						type: change.type,
						target: this.getIndex(change.target),
						previous: change.previous,
						next: change.next
					})
					break
				case operationTypes.APPEND:
				case operationTypes.CUT:
					payload = this.builder.getJson(change.target, change.last)

					if (payload.length) {
						this.currentBunch.push({
							type: change.type,
							container: this.getIndex(change.container),
							target: this.getIndex(change.target),
							payload
						})
					}

					break
			}
		}
	}

	commit() {
		if (!this.currentBunch.length) {
			return
		}

		const nextSelection = this.selection.getSelectionInIndexes()

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
						this.builder.append(
							this.findByIndex(previousEvent.container),
							this.builder.parseJson(previousEvent.payload),
							this.findByIndex(previousEvent.target)
						)
						break
					case operationTypes.APPEND:
						this.builder.cutUntil(
							this.findByIndex(previousEvent.target),
							this.findByOffset(previousEvent.target, previousEvent.payload.length)
						)
						break
					case operationTypes.ATTRIBUTE:
						this.builder.setAttributes(this.findByIndex(previousEvent.target), previousEvent.previous)
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
						this.builder.cutUntil(
							this.findByIndex(nextEvent.target),
							this.findByOffset(nextEvent.target, nextEvent.payload.length)
						)
						break
					case operationTypes.APPEND:
						this.builder.append(
							this.findByIndex(nextEvent.container),
							this.builder.parseJson(nextEvent.payload),
							this.findByOffset(nextEvent.target, nextEvent.payload.length)
						)
						break
					case operationTypes.ATTRIBUTE:
						this.builder.setAttributes(this.findByIndex(nextEvent.target), nextEvent.next)
						break
				}
			}

			this.selection.setSelectionByIndexes(selectionIndexes)
			this.isLockPushChange = false
			this.timeindex++
		}
	}

	getIndex(node) {
		const path = []
		let index = 0
		let current = node

		while (current && current !== this.root) {
			if (current.previous) {
				index++
				current = current.previous

				continue
			}

			if (current.parent) {
				path.unshift(index)
				index = 0
				current = current.parent
			} else {
				break
			}
		}

		return path
	}

	findByIndex(input) {
		const path = [...input]
		let current = this.root
		let index
		let i

		while (path.length) {
			current = current.first
			index = path.shift()

			for (i = 0; i < index; i++) {
				current = current.next
			}
		}

		return current
	}

	findByOffset(input, offset) {
		const index = [...input]

		index[index.length - 1] += offset - 1

		return this.findByIndex(index)
	}
}
