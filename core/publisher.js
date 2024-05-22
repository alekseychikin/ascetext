export default class Publisher {
	constructor() {
		this.subscribe = this.subscribe.bind(this)
		this.sendMessage = this.sendMessage.bind(this)
		this.subscribers = []
	}

	subscribe(handler) {
		this.subscribers.push(handler)

		return () => {
			this.subscribers.splice(this.subscribers.indexOf(handler), 1)
		}
	}

	sendMessage(...params) {
		this.subscribers.forEach((handler) => handler(...params))
	}
}
