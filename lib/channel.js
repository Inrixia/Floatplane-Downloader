const settings = require('./settings.js')
const floatplaneApi = require('./floatplane/api.js')

const db = require('./db.js')
const channelDB = new db('channels')

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
		if (settings.subscriptions[subscription.creator] == undefined) {
			// Add the channel to settings if it has not already been added
			settings.subscriptions[subscription.creator] = {
				id: subscription.creator,
				title: subscription.plan.title,
				enabled: true,
				ignore: settings.subChannels[subscription.plan.title].ignoreDefaults
			}
		}

		this.id = subscription.plan.id
		this.title = subscription.plan.title
		this.description = subscription.plan.description
		this.creator  = subscription.creator
		this.enabled = settings.subscriptions[subscription.creator].enabled
		this.ignore = settings.subscriptions[subscription.creator].ignore
		
		this.videos = {}
		this.subChannels = {}

		if (!channelDB[this.id]) channelDB[this.id] = { episodeCount: 1 }

		if (settings.fileFormatting.ignoreFolderStructure) this.folderPath = settings.videoFolder // If we are ignoring folder structure then set the video.folderPath to just be the video folder
		else this.folderPath = `${settings.videoFolder}/${this.title}/`

		// REMOVE THIS
		this.episodeCount = 1;
	}

	get episodeCount() {
		return channelDB[this.id].episodeCount
	}
	set episodeCount(episodeCount) {
		channelDB[this.id].episodeCount = episodeCount
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

		// If this channel has subChannels then process them
		if (settings.subChannels[this.title.toLowerCase()] != undefined) {
			videoLoop:
			for (let v = 0; v < newVideos.length; v++) {
				const subChannelIdentifiers = settings.subChannels[this.title.toLowerCase()].channelIdentifiers
				subChannelLoop:
				for (let c = 0; c < subChannelIdentifiers.length; c++) {
					// Check if this video is part of a channel
					if (newVideos[v][subChannelIdentifiers[c].type].toLowerCase().indexOf(subChannelIdentifiers[c].check.toLowerCase()) > -1) {
						if (this.ignore[newVideos[v].channel]) continue videoLoop;
						this.subChannels[subChannelIdentifiers[c].title] = new Channel({
							creator: this.creator,
							plan: {
								id: this.id,
								title: subChannelIdentifiers[c].title,
								description: this.description
							}
						})
						this.subChannels[subChannelIdentifiers[c].title].videos[newVideos[v].id] = new Video(
							newVideos[v], 
							this.subChannels[subChannelIdentifiers[c].title],
							this.subChannels[subChannelIdentifiers[c].title].episodeCount++
						)
						continue videoLoop;
					}
				}
				let video = new Video(newVideos[v], this, this.episodeCount++)
				this.videos[video.id] = video
			}
		} else for (let v = 0; v < newVideos.length; v++) {
			video = new Video(newVideos[v], this, this.episodeCount++)
			this.videos[video.id] = video
		}
	}

	async downloadVideos() {
		return Promise.all([
			this,
			...Object.values(this.subChannels)
		].flatMap(
			channel => Object.values(channel.videos).map(video => video.download())
		))
	}
}

module.exports = Channel