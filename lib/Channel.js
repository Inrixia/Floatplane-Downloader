const db = require('@inrixia/db')

const Video = require('./Video.js')

module.exports = class Channel {
	/**
	 * Returns a channel built from a subscription.
	 * @param {{
		creator: string,
		title: string,
		ignore: boolean,
		identifier: {
			check: string,
			type: string
		}
	}} channel
	 */
	constructor(channel) {
		this.creator = channel.creator
		this.title = channel.title
		this.ignore = channel.ignore
		this.identifier = channel.identifier
		this._db = new db(`./db/channels/${channel.creator}/${channel.title}.json`)

		// Database containing the episode numbers of all videos
		if (this._db.videos === undefined) this._db.videos = {}
	}

	set episodeNo() {
		throw new Error(`You may not set episodeNo!`)
	}

	get episodeNo() {
		return ++this._db.episodeNo||(this._db.episodeNo = 1)
	}

	addVideo(video) {
		// Set the episode number
		if (this._db.videos[video.guid] === undefined) {
			// e = episodeNo, d = downloaded, p = progress (download progress if previously started downloading)
			this._db.videos[video.guid] = { e: this.episodeNo() }
		}
		video._db = this._db.videos[video.guid]
		return new Video(video, this)
		// if (new Date(video.releaseDate) > new Date(this.db.lastSeenVideo.releaseDate)) {
		// 	this.db.videos.push({ guid: video.guid, releaseDate: video.releaseDate })
		// }
	}
}

module.exports = Subscription