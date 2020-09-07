const PlexAPI = require("plex-api");
const Multiprogress = require("multi-progress");
const multi = Multiprogress(process.stdout);

const db = require('@inrixia/db')
const { loopError } = require('@inrixia/helpers/object')
const prompts = require('./lib/prompts.js')

const settings = new db('settings', path.join(__dirname, `../config/settings.json`))
const auth = new db('auth', null, settings.authenticationDB.encrypt?settings.authenticationDB.encryptionKey:null)

const fApi = new (require('floatplane'))

const Subscription = require('./lib/subscription.js')



const subchanneDefaults = require('./lib/floatplane/subchannelDefaults.json')

let plexClient;

fApi.headers['User-Agent'] = `FloatplaneDownloader/${require('./package.json').version} (Inrix, +https://github.com/Inrixia/Floatplane-Downloader)`

/**
 * Main function that triggeres everything else in the script
 */
const start = async () => {
	if (settings.autoFetchServer) {
		console.log("> Finding best edge server")
		settings.floatplane.server = `https://${await floatplaneClient.findBestEdge()}`;
		console.log(`\n\u001b[36mFound! Using Server \u001b[0m[\u001b[38;5;208m${settings.floatplane.server}\u001b[0m]`);
	}

	// Fetch subscriptions from floatplane
	const SUBS = (await floatplaneClient.fetchSubscriptions()).map(subscription => {
		if (
			subscription.plan.title == 'Linus Tech Tips' ||
			subscription.plan.title == 'LTT Supporter (OG)' ||
			subscription.plan.title == 'LTT Supporter (1080p)' ||
			subscription.plan.title == 'LTT Supporter Plus'
		) subscription.plan.title = 'Linus Tech Tips'

		// Add the subscription to settings if it doesnt exist
		if (settings.subscriptions[subscription.creator] == undefined) {
			settings.subscriptions[subscription.creator] = {
				id: subscription.creator,
				title: subscription.plan.title,
				enabled: true,
				subchannels: subchanneDefaults[subscription.plan.title.toLowerCase()]
			}
		}
		if (!subscription.enabled) return null

		subscription.enabled = settings.subscriptions[subscription.creator].enabled
		subscription.subchannels = settings.subscriptions[subscription.creator].subchannels

		return new Subscription(subscription)
	}).filter(SUB => SUB!=null)

	console.log(SUBS)


	// 	await Promise.all(Object.keys(settings.subscriptions).map(async key => {
	// 		const subscription = settings.subscriptions[key];
	// })
	
	
	


	
	// console.log('> Updated subscriptions!')
	// for (let i = 0; i < channels.length; i++) {
	// 	await channels[i].fetchVideos()
	// 	if (channels[i].enabled) channels[i].downloadVideos()
	// }
}

/**
 * Excute fetch & download if repeating is enabled in settings.
 */
const repeat = async () => {
	// Check if repeating the script is enabled in settings, if not then skip to starting the script
	if (settings.repeatScript != false && settings.repeatScript != 'false') {
		const MULTIPLIERS = { // Contains the number of seconds for each time
			"s": 1,
			'm': 60,
			'h': 3600,
			'd': 86400,
			'w': 604800
		}
		let countDown = settings.repeatScript.slice(0, -1)*MULTI/60 // countDown is the number of minutes remaining until the script restarts
		const MULTI = MULTIPLIERS[String(settings.repeatScript.slice(-1)).toLowerCase()] // This is the multiplier selected based on that the user states, eg 60 if they put m at the end
		console.log(`\u001b[41mRepeating for ${settings.repeatScript} or ${settings.repeatScript.slice(0, -1)*MULTI} Seconds.\u001b[0m`);
		await start(); // Run the script
		setInterval(async () => { // Set a repeating function that is called every 60 seconds to notify the user how long until a script run
			console.log(`${countDown} Minutes until script restarts...`);
			if (countDown > 0) countDown-- // If countDown isnt 0 then drop the remaining minutes by 1
			else {
				console.log(`Script auto restarting...\n`)
				countDown = settings.repeatScript.slice(0, -1)*MULTI/60 // If it is 0 then the script has restarted so reset it
				await start();
			}
		}, 60*1000);
	} else await start() // If settings.repeatScript is false then just run the script once
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

/**
 * Fetches new videos for a given subscription.
 * @param {string} subscriptionID
 * @param {int} maxVideos Maximum videos to fetch (Increments of 20)
 */
const getSubscriptionVideos = async (subscriptionID, maxVideos=20) => {
	let subscriptionVideos = []
	let fetchAfter = 0;
	while (fetchAfter < settings.maxVideos) {
		subscriptionVideos = subscriptionVideos.concat(await fAPI.fetchVideos(subscriptionID, fetchAfter))
		fetchAfter += 20
	}
	return subscriptionVideos
}

const doFloatplaneLogin = async () => {
	let userDetails = await loopError(async () => {
		const { username, password } = await prompts.floatplaneCredentials()
		const user = await fAPI.login(username, password)
		return { username, password, user }
	}, async err => console.log('\nLooks like those login details didnt work, Please try again...'))

	const username = userDetails.username
	const password = userDetails.password

	if (userDetails.user.needs2FA) {
		console.log(`Looks like you have 2Factor authentication enabled. Nice!\n`)

		userDetails = await loopError(async () => {
			const token = await prompts.floatplaneToken()
			const user = await fAPI.twoFactorLogin(token)
			return { token, user }
		}, async err => console.log('\nLooks like that 2Factor token didnt work, Please try again...'))
	}

	const token = userDetails.token
	const user = userDetails.user

	console.log(`\nSigned in as ${user.username}!\n`)

	console.log(`Username/Password/Token does not need to be saved, cookies can re-used.`)
	console.log(`However you may need to login again at some point in the future if you dont save them...`)
	if (await prompts.saveLoginDetails()) {
		settings.encryptAuthenticationDB = await prompts.encryptAuthDB()
		if (!settings.encryptAuthenticationDB) auth = new db('auth', null, settings.authenticationDB.encrypt?settings.authenticationDB.encryptionKey:null)
		auth.fp.username = username
		auth.fp.password = password
		auth.fp.token = token
		console.log(`Saved login details!\n`)
	}
}

const firstLaunch = async () => {
	console.log(`Welcome to Floatplane Downloader! Thanks for checking it out <3.`)
	console.log(`According to your settings.json this is your first launch! So lets go through the basic setup...\n`)

	// Prompt & Set videoFolder
	settings.videoFolder = await prompts.videoFolder(settings.videoFolder)||settings.videoFolder

	// Prompt & Set maxVideos
	settings.maxVideos = await prompts.maxVideos(settings.maxVideos)||settings.maxVideos

	// Prompt & Set maxParallelDownloads
	settings.maxParallelDownloads = await prompts.maxParallelDownloads(settings.maxParallelDownloads)||settings.maxParallelDownloads

	// Prompt & Set videoResolution
	settings.videoResolution = await prompts.videoResolution()||settings.videoResolution

	// Prompt & Set fileFormatting
	settings.fileFormatting = await prompts.fileFormatting(settings.fileFormatting, settings._fileFormattingOPTIONS)||settings.fileFormatting

	// Prompt & Set Extras
	settings.extras = await prompts.extras(settings.extras)||settings.extras

	console.log(`\nNext we are going to login to floatplane...`)
	settings.floatplane.videoResolution = await doFloatplaneLogin(settings.floatplane.videoResolution)||settings.floatplane.videoResolution;

	// Prompt to find best edge server for downloading
	if (await prompts.findBestServerNow()) settings.floatplane.server = await fAPI.findBestEdge()
	console.log(`Best Edge server found is: "${settings.floatplane.server}"\n`)

	// Prompt & Set auto finding best edge server
	settings.floatplane.findBestServer = await autoFindBestServer()||settings.floatplane.findBestServer
}

// Async start
;(async () => {
	// Earlybird functions, these are run before script start and not run again if script repeating is enabled.
	if (settings.firstLaunch) await firstLaunch();

	process.exit(1);

	// Get Plex details of not saved
	if (settings.plex.local.enabled || settings.plex.remote.enabled) {
		if (settings.plex.remote.enabled) {
			if (!auth.plex) auth.plex = {}
			if (!auth.plex.user || !auth.plex.password || !settings.plex.remote.ip || !settings.plex.remote.port) [
				auth.plex.user, 
				auth.plex.password, 
				settings.plex.remote.ip,
				settings.plex.remote.port
			] = await prompts.remotePlexDetails() // If the user has not specified login details prompt for them
			plexClient = new PlexAPI({ 
				hostname: settings.plex.ip, 
				port: settings.plex.port, 
				username: auth.plex.user, 
				password: auth.plex.password 
			})
		}
		if (settings.plex.sectionsToUpdate == []) settings.plex.sectionsToUpdate = await prompts.plexSection()
	}

	// Get Floatplane credentials if not saved
	if (!auth.fp) auth.fp = {}
	if (!auth.fp.user || !auth.fp.password) [
		auth.fp.user, 
		auth.fp.password, 
		auth.fp.token
	] = await prompts.floatplaneCredentials() // If the user has not specified login details prompt for them
	else console.log('> Using saved login details...');

	await repeat()
})().catch(err => {
	console.log(`An error occurred:`)
	console.log(err)
	process.exit(1)
})