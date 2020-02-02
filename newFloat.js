const settings = require('./lib/settings.js')
const videoManager = require('./lib/videoManager.js')
const request = require('./lib/request.js')
const plex = require('./lib/plex.js')
const floatplaneApi = require('./lib/floatplane/api.js')
const auth = require('./lib/floatplane/auth.js')

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
	await videoManager.init()
	await plex.init()
	await repeat()
})()

const start = async () => { // This is the main function that triggeres everything else in the script
	await auth.init()
	if (settings.autoFetchServer) await floatplaneApi.findBestEdge();
	await floatplaneApi.fetchSubscriptions()
	await videoManager.displayVideosDetails()
	const subscriptionsToProcess = await getVideos()
	const videosToDownload = subscriptionsToProcess.flatMap(sub =>
		sub.subscriptionVideos.sort((a, b) => new Date(b.releaseDate)-new Date(a.releaseDate))
		.map(video => videoManager.processVideo(video, sub.subscription))
	).filter(video => video != false)
	console.log(videosToDownload.map(video => video.fileName))
}

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