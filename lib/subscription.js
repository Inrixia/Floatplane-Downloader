const db = require('@inrixia/db')

class Subscription {
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
		skip: boolean,
		channels: Array<{
			title: string,
        	skip: boolean,
        	identifier: {
        		check: string,
        		type: string
          	}
		}>
	}} subscription
	 */
	constructor(subscription) {
		this.db = new db(`./db/subscriptions/${subscription.creator}.json`)
		if (Object.keys(this.db).length === 0) db.load(this.db, subscription)
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
}

module.exports = Subscription