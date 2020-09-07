const sanitize = require("sanitize-filename");
const builder = require('xmlbuilder');

class Video {
	/**
	 * Returns a video.
	 * @param {Object} video
	 * @param {string} video.title
	 * @param {sring} video.id
	 * @param {string} video.description
	 * @param {string} video.releaseDate
	 * @param {number} video.duration
	 * @param {Object} video.thumbnail
	 * @param {number} video.thumbnail.width
	 * @param {number} video.thumbnail.height
	 * @param {string} video.thumbnail.path
	 * @param {number} episodeNumber
	 * @param {number} seasonNumber
	 * @param {Channel} channel
	 */
	constructor(video, channel, episodeNumber) {
		this.title = video.title
		this.id = video.guid
		this.description = video.description
		this.releaseDate = new Date(video.releaseDate)
		this.duration = video.duration
		this.thumbnail = video.thumbnail
		this.episodeNumber = episodeNumber
		this.channel = channel
	}

	async download() {
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
		.replace(/\%episodeNumber\%/g, this.episodeNumber)
		.replace(/\%year\%/g, YEAR)
		.replace(/\%month\%/g, MONTH)
		.replace(/\%videoTitle\%/g, this.title.replace(/ - /g, ' '))
	}
}


// const cleanupExistingVideos = () => {
// 	Object.keys(videoDB).forEach(videoID => {
// 		if (videoDB[videoID].channel == "The WAN Show") {
// 			if (partialDB[videoID]) {
// 				if (fs.existsSync(videoDB[videoID].file)) fs.unlinkSync(videoDB[videoID].file);
// 				if (fs.existsSync(videoDB[videoID].artworkFile)) fs.unlinkSync(videoDB[videoID].artworkFile);
// 				if (fs.existsSync(videoDB[videoID].videoFile)) fs.unlinkSync(videoDB[videoID].videoFile);
// 				if (fs.existsSync(videoDB[videoID].audioFile)) fs.unlinkSync(videoDB[videoID].audioFile);
// 			}
// 			if (!fs.existsSync(videoDB[videoID].file) && !fs.existsSync(videoDB[videoID].videoFile) && !fs.existsSync(videoDB[videoID].audioFile)) { //  If the video does not exist remove it from videos.json
// 				delete videoDB[videoID];
// 				delete partialDB[videoID];
// 				return;
// 			}
// 		} else {
// 			if (!fs.existsSync(videoDB[videoID].file)) {
// 				delete videoDB[videoID]
// 				delete partialDB[videoID]
// 				return
// 			} //  If the video does not exist remove it from videos.json
// 			const videoStats = fs.statSync(videoDB[videoID].file);
// 			if (videoDB[videoID].saved === true && videoStats.size < 10000) delete videoDB[videoID]; // If the video is saved but its size is less than 10kb its failed, remove it.
// 			partialDB[videoID] = { transferred: videoStats.size }; // If the video is partially downloaded set its transferred size to its current size
// 		}
// 	});
// }

// const init = async () => {
// 	if (!fs.existsSync(settings.videoFolder)) fs.mkdirSync(settings.videoFolder); // Create the video folder needed
// 	await cleanupExistingVideos()
// }

const displayVideosDetails = async () => { // Print out the current number of "episodes" for each channel
	console.log('\n\n=== \u001b[38;5;8mEpisode Count\u001b[0m ===')
	for (channel in channelDB) {
		if (settings.colourList[channel] == undefined) settings.colourList[channel] = '\u001b[38;5;153m'
		if (channel.indexOf(".") == -1) console.log(settings.colourList[channel]+channel+'\u001b[0m:', Object.keys(channelDB[channel]).length)
	}
	if (Object.keys(channelDB).length == 0) console.log('> No Episodes Yet!')
	console.log()
}

const processVideo = (video, subscription) => {
	// Set defaults for video
	video.channel = subscription.title

	/*
	/ Channel Matching
	*/
	if (settings.subChannels[subscription.title]) {
		settings.subChannels[subscription.title].channelIdentifiers[subscription.title].forEach(channel => { // For each subchannel defined for a subscription
			if(video[channel.type].toLowerCase().indexOf(channel.check.toLowerCase()) > -1) { // Check if this video is part of a channel
				video.channel = channel.title
			}
		});
	}
	if (subscription.ignore[video.channel]) return // If this video is part of a channel we are ignoring then break
	if (!settings.colourList[video.channel]) settings.colourList[video.channel] = '\u001b[38;5;153m' // If this video's channel does not have a colour specified for its display, set a default

	if (videoDB[video.guid] == undefined) { // If this video does not exist in the videosDB meta then add it
		video.partial = false
		video.saved = false
		videoDB[video.guid] = video
	}

	// Maintain a count of videos for each channel to ensure proper numbering
	if (channelDB[video.channel] == undefined) channelDB[video.channel] = {}
	if (channelDB[video.channel][video.guid] == undefined) channelDB[video.channel][video.guid] = Object.keys(channelDB[video.channel]).length+1
	video.episodeNumber = channelDB[video.channel][video.guid]

	video = formatVideoFilename(formatVideoFolder(video));

	// if (!videoDB[video.guid].saved) { // If the video is not already downloaded
	// 	video.url = `${settings.floatplaneServer}/Videos/${video.guid}/${settings.video_res}.mp4?wmsAuthSign=${settings.key}`;
	// 	console.log(`${settings.colourList[video.channel]}>-- \u001b[0m${video.title} == \u001b[34mDOWNLOADING\u001b[0m`);
	// 	// if (settings.extras.downloadArtwork && video.thumbnail) { // If downloading artwork is enabled download it
	// 	// 	request(video.thumbnail.path).pipe(fs.createWriteStream(`${video.folderPath}${video.title}.${settings.extras.artworkFormat$}`))
	// 	// } // Save the thumbnail with the same name as the video so plex will use it

	// 	// if (liveCount < settings.maxParallelDownloads || settings.maxParallelDownloads == -1) { // If we havent hit the maxParallelDownloads or there isnt a limit then download
	// 	// 	if (videoDB[video.guid].partial) process.stdout.write(`${settings.colourList[video.channel]}>-- \u001b[0m${video.title} == \u001b[38;5;226mRESUMING DOWNLOAD\u001b[0m`);
	// 	// 	else process.stdout.write(`${settings.colourList[video.channel]}>-- \u001b[0m${video.title} == \u001b[34mDOWNLOADING\u001b[0m`);
	// 	// 	downloadVideo(video) // Download the video
	// 	// } else { // Otherwise add to queue
	// 	// 	if (videoDB[video.guid].partial) process.stdout.write(`${settings.colourList[video.channel]}>-- \u001b[0m${video.title} == \u001b[35mQUEUED \u001b[38;5;226mRESUME\u001b[0m`);
	// 	// 	else process.stdout.write(`${settings.colourList[video.channel]}>-- \u001b[0m${video.title} == \u001b[35mQUEUED\u001b[0m`);
	// 	// 	queueDownload(video) // Queue
	// 	// }
	// 	// if (settings.extras.saveNfo) {
	// 	// 	const nfo = builder.create('episodedetails').ele('title').text(video.title).up().ele('showtitle').text(video.channel).up().ele('description').text(video.description).up().ele('aired').text(video.releaseDate).up().ele('season').text(video.seasonNumber).up().ele('episode').text(video.episodeNumber).up().end({ pretty: true });
	// 	// 	fs.writeFileSync(`${+video.folderPath}${video.fileName}.nfo`, nfo, 'utf8')
	// 	// }
	// } else console.log(`${settings.colourList[video.channel]}${video.channel}\u001b[0m> ${video.title} == \u001b[32mEXISTS\u001b[0m`);
	return video
}

module.exports = Video