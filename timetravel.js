const operationTypes = {
	CUT: 'cut',
	APPEND: 'append',
	PRECONNECT: 'preconnect',
	CONNECT: 'connect'
}

const timeline = []
let timeindex = -1
let isLockPushChange = false
let currentBunch = []
let timer = null

function pushChange(event) {
	if (!isLockPushChange) {
		if (timer !== null) {
			clearTimeout(timer)
		}

		currentBunch.push(event)

		timer = setTimeout(() => {
			console.log(timeindex, timeline.length)
			if (timeindex < timeline.length - 1) {
				timeline.splice(timeindex + 1)
			}

			timeline.push(currentBunch)
			currentBunch = []
			timeindex++

			console.log('pushChange', timeline)
		}, 100)
	}
}

function goBack() {
	if (timeindex > -1) {
		const previousBunch = timeline[timeindex]
		let i = previousBunch.length - 1
		let previousEvent = null

		isLockPushChange = true

		for (; i >= 0; i--) {
			previousEvent = previousBunch[i]

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

		isLockPushChange = false
		timeindex--

		console.log(timeindex, timeline.length)
		console.log('goBack', timeline)
	}
}

function goForward() {
	if (timeindex < timeline.length - 1) {
		const previousBunch = timeline[timeindex + 1]
		let nextEvent = null

		isLockPushChange = true

		for (i = 0; i < previousBunch.length; i++) {
			nextEvent = previousBunch[i]

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

		isLockPushChange = false
		timeindex++
	}
}

module.exports = {
	pushChange,
	goBack,
	goForward,
	operationTypes
}
