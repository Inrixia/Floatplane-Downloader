const settings = require('./settings.js')

const db = require('./db.js')
const subscriptionDB = new db('subscriptions')

class Subscription {
	/**
	 * Returns a channel built from a subscription.
	 * @param {object} subscription
	 * @param {string} subscription.creator
	 * @param {object} subscription.plan 
	 * @param {string} subscription.plan.id
	 * @param {string} subscription.plan.title
	 * @param {string} subscription.plan.description
	 * @param {bool} subscription.enabled
	 * @param {object} subscription.subchannels
	 */
	constructor(subscription) {
		this.id = subscription.plan.id
		this.title = subscription.plan.title
		this.description = subscription.plan.description
		this.creator  = subscription.creator
		this.enabled = subscription.enabled
		this.subchannels = subscription.subchannels
		
		this.videos = {}

		if (!channelDB[this.id]) channelDB[this.id] = { episodeCount: 0 }
	}

	get episodeCount() {
		return channelDB[this.id].episodeCount
	}
	set episodeCount(episodeCount) {
		channelDB[this.id].episodeCount = episodeCount
	}

	async addVideo() {
		// If this channel has subChannels then process them
		if (settings.subChannels[this.title.toLowerCase()] != undefined) {
			const subChannelIdentifiers = settings.subChannels[this.title.toLowerCase()].channelIdentifiers
			for (sChanIdentifer of subChannelIdentifiers) {
				// Lowercase both the string to match and the string to check, then check if they match.
				if (video[sChanIdentifer.type].toLowerCase().indexOf(sChanIdentifer.check.toLowerCase()) > -1) {
					// Add the subchannel to this channel if identified & not already present
					if (!this.subChannels[sChanIdentifer.title]) this.subChannels[sChanIdentifer.title] = new Channel({
						creator: this.creator,
						plan: {
							id: this.id,
							title: sChanIdentifer.title,
							description: this.description
						}
					})
					// Add the video to the subchannel
					this.subChannels[sChanIdentifer.title].videos[video.id] = new Video(
						video, 
						this.subChannels[sChanIdentifer.title],
						this.subChannels[sChanIdentifer.title].episodeCount++
					)
					break; // If a subchannel has been found then dont bother searching the rest of the identifiers.
				}
			}
			// If no subchannel was found add the video to the main channel
			this.videos[video.id] = new Video(video, this, this.episodeCount++)
		// If this channel has no subchannels defined just add all videos to the main channel
		} else for (video of newVideos) {
			this.videos[video.id] = new Video(video, this, this.episodeCount++)
		}
	}

	/**
	 * Fetch new videos from the channel.
	 * @param {number} maxVideoCount Maximum number of videos to fetch (from the latest video).
	 */
	async fetchVideos(maxVideoCount = settings.maxVideos) {
		let fetchAfter = 0;
		let newVideos = [];
		while (fetchAfter < maxVideoCount) {
			newVideos = newVideos.concat(await floatplaneApi.fetchVideos(this.creator, fetchAfter))
			// // If the maxPages is more than 1 then log the === LinusTechTips === as === LinusTechTips - Page x ===
			// if(settings.maxVideos > 20) console.log(`=== \u001b[38;5;8m${subscription.title}\u001b[0m - \u001b[95mPage ${fetchAfter/20} Fetched\u001b[0m ===`)
			fetchAfter += 20
		}
		// Sort videos by release date
		newVideos.sort((a, b) => new Date(a.releaseDate)-new Date(b.releaseDate))

		
	}

	async downloadNewVideos() {
		return Promise.all([
			this,
			...Object.values(this.subChannels)
		].flatMap(
			channel => Object.values(channel.videos).map(video => video.download())
		))
	}
}

module.exports = Subscription