const settings = new (require('@inrixia/db'))(`./config/settings.json`)

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
		_db: {
			e: number,
			d?: boolean,
			f?: string,
			p?: number
		}
	 }} video
	 * @param {Object} video._db Database entry for this db that is mutable
	 * @param {number} video._db.e Episode number
	 * @param {number} video._db.d If video is downloaded
	 * @param {string} video._db.d If video is downloaded location of file sans extension
	 * @param {number} video._db.p How much video was downloaded in bytes
	 * @param {Channel} channel
	 */
	constructor(video, channel) {
		this.guid = video.guid
		this.title = video.title
		this.description = video.description
		this.releaseDate = new Date(video.releaseDate)
		this.duration = video.duration
		this.thumbnail = video.thumbnail
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

	async download() {
		if (!(await this.downloaded)) { // If the video is not already downloaded
			// if (settings.extras.downloadArtwork && video.thumbnail) { // If downloading artwork is enabled download it
			// 	request(video.thumbnail.path).pipe(fs.createWriteStream(`${video.folderPath}${video.title}.${settings.extras.artworkFormat$}`))
			// } // Save the thumbnail with the same name as the video so plex will use it

			// if (liveCount < settings.maxParallelDownloads || settings.maxParallelDownloads == -1) { // If we havent hit the maxParallelDownloads or there isnt a limit then download
			// 	if (videoDB[video.guid].partial) process.stdout.write(`${settings.colourList[video.channel]}>-- \u001b[0m${video.title} == \u001b[38;5;226mRESUMING DOWNLOAD\u001b[0m`);
			// 	else process.stdout.write(`${settings.colourList[video.channel]}>-- \u001b[0m${video.title} == \u001b[34mDOWNLOADING\u001b[0m`);
			// 	downloadVideo(video) // Download the video
			// } else { // Otherwise add to queue
			// 	if (videoDB[video.guid].partial) process.stdout.write(`${settings.colourList[video.channel]}>-- \u001b[0m${video.title} == \u001b[35mQUEUED \u001b[38;5;226mRESUME\u001b[0m`);
			// 	else process.stdout.write(`${settings.colourList[video.channel]}>-- \u001b[0m${video.title} == \u001b[35mQUEUED\u001b[0m`);
			// 	queueDownload(video) // Queue
			// }
			// if (settings.extras.saveNfo) {
			// 	const nfo = builder.create('episodedetails').ele('title').text(video.title).up().ele('showtitle').text(video.channel).up().ele('description').text(video.description).up().ele('aired').text(video.releaseDate).up().ele('season').text(video.seasonNumber).up().ele('episode').text(video.episodeNo).up().end({ pretty: true });
			// 	fs.writeFileSync(`${+video.folderPath}${video.fileName}.nfo`, nfo, 'utf8')
			// }
		} else console.log(`${settings.colourList[video.channel]}${video.channel}\u001b[0m> ${video.title} == \u001b[32mEXISTS\u001b[0m`);
		console.log(JSON.stringify(this.file))
		//if (!settings.colourList[video.channel]) settings.colourList[video.channel] = '\u001b[38;5;153m'if (!settings.colourList[video.channel]) settings.colourList[video.channel] = '\u001b[38;5;153m'
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