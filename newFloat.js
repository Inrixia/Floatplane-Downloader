const settings = require('./lib/settings.js')
const plex = require('./lib/plex.js')
const floatplaneApi = require('./lib/floatplane/api.js')
const auth = require('./lib/floatplane/auth.js')

const Channel = require('./lib/Channel.js')

const progress = require('request-progress');
const Multiprogress = require("multi-progress");
const multi = new Multiprogress(process.stdout);

// Firstly check if there is a new version and notify the user
// request.get({ // Check if there is a newer version avalible for download
// 	url: 'https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/latest.json',
// }, (err, resp, body) =>  {
// 	updateInfo = JSON.parse(body)
// 	if(updateInfo.version > settings.version) { // If the script is outdated
// 		fLog(`Pre-Init > New Version Avalible: v${updateInfo.version} | Update with update.bat!`)
// 		console.log(`\u001b[33mNew Version Avalible: v${updateInfo.version} | Update with update.bat!\u001b[0m`)
// 	} else if(updateInfo.version < settings.version) { // If the script is a beta version/nonpublic
// 		console.log('\u001b[35mOhh, your running a hidden beta! Spooky...\u001b[0m')
// 	}
// 	pureStart();
// })

// Async start
;(async () => {
	// Earlybird functions, these are run before script start for things such as auto repeat and getting plex info
	// await videoManager.init()
	await plex.init()
	await repeat()
})()

/**
 * Login, fetch info and download new videos.
 */
const start = async () => { // This is the main function that triggeres everything else in the script
	await auth.init()
	if (settings.autoFetchServer) await floatplaneApi.findBestEdge();
	const channels = (await floatplaneApi.fetchSubscriptions()).map(sub => new Channel(sub))
	for (let i = 0; i < channels.length; i++) {
		channels[i].fetchVideos()
		if (channels[i].enabled) channels[i].downloadVideos()
	}
}

/**
 * Excute fetch & download if repeating is enabled in settings.
 */
const repeat = async () => {
	// Check if repeating the script is enabled in settings, if not then skip to starting the script
	if (settings.repeatScript != false && settings.repeatScript != 'false') {
		const multipliers = { // Contains the number of seconds for each time
			"s": 1,
			'm': 60,
			'h': 3600,
			'd': 86400,
			'w': 604800
		}
		let countDown = settings.repeatScript.slice(0, -1)*multiplier/60 // countDown is the number of minutes remaining until the script restarts
		const multiplier = multipliers[String(settings.repeatScript.slice(-1)).toLowerCase()] // This is the multiplier selected based on that the user states, eg 60 if they put m at the end
		console.log(`\u001b[41mRepeating for ${settings.repeatScript} or ${settings.repeatScript.slice(0, -1)*multiplier} Seconds.\u001b[0m`);
		await start(); // Start the script for the first time
		setInterval(async () => { // Set a repeating function that is called every 60 seconds to notify the user how long until a script run
			console.log(`${countDown} Minutes until script restarts...`);
			if(countDown > 0) countDown-- // If countDown isnt 0 then drop the remaining minutes by 1
			else {
				console.log(`Script auto restarting...\n`)
				countDown = settings.repeatScript.slice(0, -1)*multiplier/60 // If it is 0 then the script has restarted so reset it
				await start();
			}
		}, 60*1000);
	} else await start()
}

const getVideos = async () => {
	const subscriptionVideos = await Promise.all(Object.keys(settings.subscriptions).map(async key => {
		const subscription = settings.subscriptions[key];
		let subscriptionVideos = []
		if (!subscription.enabled) return // If this subscription is disabled then dont download
		let fetchAfter = 0;
		while (fetchAfter < settings.maxVideos) {
			subscriptionVideos = subscriptionVideos.concat(await floatplaneApi.fetchVideos(subscription, fetchAfter))
			// If the maxPages is more than 1 then log the === LinusTechTips === as === LinusTechTips - Page x ===
			if(settings.maxVideos > 20) console.log(`=== \u001b[38;5;8m${subscription.title}\u001b[0m - \u001b[95mPage ${fetchAfter/20} Fetched\u001b[0m ===`)
			fetchAfter += 20
		}
		return { subscription, subscriptionVideos }
	}))
	return subscriptionVideos
}

const downloadVideo = video => { // This handles resuming downloads, its very similar to the download function with some changes
	let videoSize = videos[video.guid].size ? videos[video.guid].size : 0 // // Set the total size to be equal to the stored total or 0
	let videoDownloadedBytes = videos[video.guid].transferred ? videos[video.guid].transferred : 0; // Set previousTransferred as the previous ammount transferred or 0
	let fileOptions = { start: videoDownloadedBytes, flags: videos[video.guid].file ? 'r+' : 'w' };
	let displayTitle = '';
	// If this video was partially downloaded
	if (videos[video.guid].partial) displayTitle = pad(`${colourList[video.subChannel]}${video.subChannel}\u001b[0m> ${video.title.slice(0,35)}`, 36) // Set the title for being displayed and limit it to 25 characters
	else displayTitle = pad(`${colourList[video.subChannel]}${video.subChannel}\u001b[0m> ${video.title.slice(0,25)}`, 29) // Set the title for being displayed and limit it to 25 characters
	
	const bar = multi.newBar(':title [:bar] :percent :stats', { // Create a new loading bar
		complete: '\u001b[42m \u001b[0m',
		incomplete: '\u001b[41m \u001b[0m',
		width: 30,
		total: 100
	})
	progress(floatRequest({ // Request to download the video
		url: video.url,
		headers: (videos[video.guid].partial) ? { // Specify the range of bytes we want to download as from the previous ammount transferred to the total, meaning we skip what is already downlaoded
			Range: `bytes=${videos[video.guid].transferred}-${videos[video.guid].size}`
		} : {}
	}), {throttle: settings.downloadUpdateTime}).on('progress', function (state) { // Run the below code every downloadUpdateTime while downloading
		if (!videos[video.guid].size) {
			videos[video.guid].size = state.size.total;
			videos[video.guid].partial = true
			videos[video.guid].file = video.rawPath+video.title+'.mp4.part';
			saveVideoData();
		}
		// Set the amount transferred to be equal to the preious ammount plus the new ammount transferred (Since this is a "new" download from the origonal transferred starts at 0 again)
		if (state.speed == null) {state.speed = 0} // If the speed is null set it to 0
		bar.update((videoDownloadedBytes+state.size.transferred)/videos[video.guid].size) // Update the bar's percentage with a manually generated one as we cant use progresses one due to this being a partial download
		// Tick the bar same as above but the transferred value needs to take into account the previous amount.
		bar.tick({'title': displayTitle, 'stats': `${((state.speed/100000)/8).toFixed(2)}MB/s ${((videoDownloadedBytes+state.size.transferred)/1024000).toFixed(0)}/${((videoDownloadedBytes+state.size.total)/1024000).toFixed(0)}MB ETA: ${Math.floor(state.time.remaining/60)}m ${Math.floor(state.time.remaining)%60}s`})
		videoSize = (videoDownloadedBytes+state.size.total/1024000).toFixed(0) // Update Total for when the download finishes
		//savePartialData(); // Save this data
	}).on('error', function(err, stdout, stderr) { // On a error log it
		if (videos[video.guid].partial) fLog(`Resume > An error occoured for "${video.title}": ${err}`)
		else fLog('Download > An error occoured for "'+video.title+'": '+err)
		console.log(`An error occurred: ${err.message} ${err} ${stderr}`);
	}).on('end', function () { // When done downloading
		fLog(`Download > Finished downloading: "${video.title}"`)
		bar.update(1) // Set the progress bar to 100%
		// Tick the progress bar to display the totalMB/totalMB
		bar.tick({'title': displayTitle, 'stats': `${(videoSize/1024000).toFixed(0)}/${(videoSize/1024000).toFixed(0)}MB`})
		bar.terminate();
		videos[video.guid].partial = false;
    videos[video.guid].saved = true;
    saveVideoData();
		queueCount -= 1 // Reduce queueCount by 1
	// Write out the file to the partial file previously saved. But write with read+ and set the starting byte number (Where to start wiriting to the file from) to the previous amount transferred
	}).pipe(fs.createWriteStream(video.rawPath+video.title+'.mp4.part', fileOptions)).on('finish', function(){ // When done writing out the file
		fs.rename(video.rawPath+video.title+'.mp4.part', video.rawPath+video.title+'.mp4', function(){
			videos[video.guid].file = video.rawPath+video.title+'.mp4'; // Specifies where the video is saved
			saveVideoData();
			let temp_file = video.rawPath+'TEMP_'+video.title+'.mp4' // Specify the temp file to write the metadata to
			ffmpegFormat(temp_file, video) // Format with ffmpeg for titles/plex support
		}); // Rename it without .part
	});
}