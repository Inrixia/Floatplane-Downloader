const db = require('@inrixia/db')

const Channel = require('./Channel.js')

module.exports = class Subscription {
	/**
	 * Returns a channel built from a subscription.
	 * @param {{
		startDate: string,
		endDate: string,
		paymentID: number,
		interval: string,
		paymentCancelled: boolean,
		plan: {
			id: string,
			title: string,
			description: string,
			price: string,
			priceYearly: (string|null),
			currency: string,
			logo: (string|null),
			interval: string,
			featured: boolean,
			allowGrandfatheredAccess: boolean
		},
		creator: string,
		skip: boolean
	}} subscription
	* @param {Array<{
		creator: string,
		title: string,
		skip: boolean,
		identifier: {
			check: string,
			type: string
		}
	}>} channels
	 */
	constructor(subscription, channels=[]) {
		this.sub = subscription
		this.channels = channels.map(channel => new Channel(channel))
		this.ownChannel = new Channel({
			creator: subscription.creator,
			title: subscription.plan.title,
			skip: false,
			identifier: null
		})
		this._db = new db(`./db/subscriptions/${subscription.creator}.json`)
	}

	/**
	 * @returns {{ releaseDate: number, guid: string }}
	 */
	get lastSeenVideo() {
		return this.db.lastSeenVideo
	}

	set lastSeenVideo() {
		throw new Error(`You may not set lastSeenVideo. Use addVideo(video) instead!`)
	}

	// addVideo(video) {
	// 	if (new Date(video.releaseDate) > new Date(this.db.lastSeenVideo.releaseDate)) {
	// 		this.db.videos.push({ guid: video.guid, releaseDate: video.releaseDate })
	// 	}
	// }

	/**
	 * @param {{
	 	id: string,
		guid: string,
		title: string,
		type: string,
		description: string,
		releaseDate: string,
		duration: number,
		creator: string,
		likes: number,
		dislikes: number,
		score: number,
		description: this.description
		primaryBlogPost: string,
		thumbnail: {
			width: number,
			height: number,
			path: string,
			childImages: Array<{ width: number, height: number, path: string }>
		},
		isAccessible: boolean,
		hasAccess: boolean,
		private: boolean,
		subscriptionPermissions: Array<string>
	}} video
	 */
	 addVideo(video) {
		for (const channel of this.channels) {
			// Check if the video belongs to this channel
			if (video[channel.identifier.type].toLowerCase().indexOf(channel.identifier.check.toLowerCase()) > -1) {
				return channel.addVideo(video)
			}
		}
		return this.ownChannel.addVideo(video)
	}
}