const settings = new (require('@inrixia/db'))(`./config/settings.json`)
const fApi = require('floatplane')

const fs = require('fs').promises

const sanitize = require("sanitize-filename");
const builder = require('xmlbuilder');

module.exports = class Video {
	/**
	 * Returns a video.
	 * @param {{
		guid: string,
		title: string,
		description: string,
		releaseDate: string,
		duration: number,
		thumbnail: {
			width: number,
			height: number,
			path: string,
			childImages: Array<{ width: number, height: number, path: string }>
		},
		_db: { 				// Database entry for this db that is mutable
			e: number, 		// Episode number
			d?: boolean,	// If video is downloaded
			f?: string, 	// If video is downloaded location of file sans extension
			p?: number 		// How much video was downloaded in bytes
		},
		fApi: fApi // Floatplane api instance
	 }} video
	 * @param {Channel} channel
	 */
	constructor(video, channel) {
		this.guid = video.guid
		this.title = video.title
		this.description = video.description
		this.releaseDate = new Date(video.releaseDate)
		this.duration = video.duration
		this.thumbnail = video.thumbnail
		this.fApi = video.fApi
		this._db = video._db
		this.channel = channel
	}

	/**
	 * @returns {Promise<boolean>}
	 */
	get downloaded() {
		return new Promise(resolve => {
			if (this._db.d === true) {
				if (this._db.f === undefined) resolve(this._db.d = false)
				else await fs.stat(this._db.f).then(() => resolve(true)).catch(() => resolve(false))
			} else resolve(false)
		})
	}

	async download(force) {
		if ((await this.downloaded) && force !== true) throw new Error('Video already downloaded! Download with force set to true to overwrite.')

		if (settings.extras.downloadArtwork && video.thumbnail) { // If downloading artwork is enabled download it
			// request(video.thumbnail.path).pipe(fs.createWriteStream(`${video.folderPath}${video.title}.${settings.extras.artworkFormat$}`))
			// TODO: Add generic request to fApi
		} // Save the thumbnail with the same name as the video so plex will use it

		if (settings.extras.saveNfo) {
			const nfo = builder.create('episodedetails')
			.ele('title').text(this.title).up()
			.ele('showtitle').text(this.channel.title).up()
			.ele('description').text(this.description).up()
			.ele('aired').text(this.releaseDate).up()
			.ele('season').text(1).up()
			.ele('episode').text(this._db.e).up()
			.end({ pretty: true });
			// TODO: get folderpath stuff sorted
			// TODO: Make all fs calls async
			// fs.writeFileSync(`${+video.folderPath}${video.fileName}.nfo`, nfo, 'utf8')
		}

		// Download video
		return this.fApi.video.download(this.guid, settings.floatplane.videoResolution)
	}

	/**
	 * @returns {string} Formatted filename of video using settings.downloading.fileFormatting.
	 */
	get file() {
		let file = sanitize(file)
		const YEAR = this.releaseDate.getFullYear()
		const MONTH = date.getMonth()>9?'0'+date.getMonth():date.getMonth() // If the month is less than 10 pad it with a 0

		return settings.downloading.fileFormatting
		.replace(/\%channelTitle\%/g, this.channel.title)
		.replace(/\%episodeNo\%/g, this._db.e)
		.replace(/\%year\%/g, YEAR)
		.replace(/\%month\%/g, MONTH)
		.replace(/\%videoTitle\%/g, this.title.replace(/ - /g, ' '))
	}
}

const processVideo = (video, subscription) => {
	video = formatVideoFilename(formatVideoFolder(video));
	return video
}