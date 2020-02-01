const settings = require('./settings.js')
const videoDB = new (require('./db.js'))('videos')
const partialDB = new (require('./db.js'))('partial')

const fs = require('fs')

const cleanupExistingVideos = () => {
	Object.keys(videoDB).forEach(videoID => {
		if (videoDB[videoID].channel == "The WAN Show") {
			if (partialDB[videoID]) {
				if (fs.existsSync(videoDB[videoID].file)) fs.unlinkSync(videoDB[videoID].file);
				if (fs.existsSync(videoDB[videoID].artworkFile)) fs.unlinkSync(videoDB[videoID].artworkFile);
				if (fs.existsSync(videoDB[videoID].videoFile)) fs.unlinkSync(videoDB[videoID].videoFile);
				if (fs.existsSync(videoDB[videoID].audioFile)) fs.unlinkSync(videoDB[videoID].audioFile);
			}
			if (!fs.existsSync(videoDB[videoID].file) && !fs.existsSync(videoDB[videoID].videoFile) && !fs.existsSync(videoDB[videoID].audioFile)) { //  If the video does not exist remove it from videos.json
				delete videoDB[videoID];
				delete partialDB[videoID];
				return;
			}
		} else {
			if (!fs.existsSync(videoDB[videoID].file)) {
				delete videoDB[videoID]
				delete partialDB[videoID]
				return
			} //  If the video does not exist remove it from videos.json
			const videoStats = fs.statSync(videoDB[videoID].file);
			if (videoDB[videoID].saved === true && videoStats.size < 10000) delete videoDB[videoID]; // If the video is saved but its size is less than 10kb its failed, remove it.
			partialDB[videoID] = { transferred: videoStats.size }; // If the video is partially downloaded set its transferred size to its current size
		}
	});
}

const init = async () => {
	if (!fs.existsSync(settings.videoFolder)) fs.mkdirSync(settings.videoFolder); // Create the video folder needed
	await cleanupExistingVideos()
}

const displayVideosDetails = async () => { // Print out the current number of "episodes" for each subchannel
	console.log('\n\n=== \u001b[38;5;8mEpisode Count\u001b[0m ===')
	if (!settings.fileFormatting.ignoreFolderStructure) {
		fs.readdirSync(settings.videoFolder).forEach(channel => {
			if (channel == 'artwork') return
			episodeList[channel] = (glob.sync(`${settings.videoFolder}/${channel}/**/*.mp4`).length)
			if (channel.indexOf(".") == -1) console.log(settings.colourList[channel]+channel+'\u001b[0m:', episodeList[channel])
		})
	} else {
		glob.sync(`${settings.videoFolder}*.mp4`).forEach(video => {
			if (video.indexOf('-') > -1) {
				if (!episodeList[video.slice(settings.videoFolder.length, video.indexOf(' -'))]) {
					episodeList[video.slice(settings.videoFolder.length, video.indexOf(' -'))] = 1
				}
				episodeList[video.slice(settings.videoFolder.length, video.indexOf(' -'))] += 1
			}
		})
		for (channel in episodeList) {
			if (settings.colourList[channel] == undefined) settings.colourList[channel] = ''
			if (channel.indexOf(".") == -1) console.log(settings.colourList[channel]+channel+'\u001b[0m:', episodeList[channel])
		}
		if (Object.keys(episodeList).length == 0) console.log('> No Episodes Yet!')
	}
}

module.exports = { init, displayVideosDetails }