const settings = require('./settings.js')
const floatplaneApi = require('./floatplane/api.js')

const Video = require('./video.js')

class Channel {
	/**
	 * Returns a channel built from a subscription.
	 * @param {Object} subscription
	 * @param {string} subscription.creator
	 * @param {Object} subscription.plan 
	 * @param {string} subscription.plan.id
	 * @param {string} subscription.plan.title
	 * @param {string} subscription.plan.description
	 */
	constructor(subscription) {
		this.id = subscription.plan.id
		this.title = subscription.plan.title
		this.description = subscription.plan.description
		this.creator  = subscription.creator
		this.videos = {}
	}

	/**
	 * Fetch new videos from the channel.
	 * @param {number} maxVideoCount Maximum number of videos to fetch (from the latest video).
	 */
	async fetchVideos(maxVideoCount = settings.maxVideos) {
		let fetchAfter = 0;
		while (fetchAfter < maxVideoCount) {
			const videos = await floatplaneApi.fetchVideos(this.creator, fetchAfter)
			videos.forEach(video => this.videos[video.id] = new Video(video))
			// // If the maxPages is more than 1 then log the === LinusTechTips === as === LinusTechTips - Page x ===
			// if(settings.maxVideos > 20) console.log(`=== \u001b[38;5;8m${subscription.title}\u001b[0m - \u001b[95mPage ${fetchAfter/20} Fetched\u001b[0m ===`)
			fetchAfter += 20
		}
		return this.videos
	}

	async downloadVideos() {
		return await Promise.all(this.videos.map(video => video.download()))
	}
}

module.exports = Channel