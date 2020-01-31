// Include the libraries we need
const request = require('request');
const cheerio = require('cheerio');
const progress = require('request-progress');
const sanitize = require("sanitize-filename");
const ffmpeg = require('fluent-ffmpeg');
const glob = require("glob");
const ytdl = require('ytdl-core');
const prompt = require('prompt');
const Multiprogress = require("multi-progress");
const multi = new Multiprogress(process.stdout);
const fs = require('fs');
const pad = require('pad');
const spawn = require('child_process').spawn;
const builder = require('xmlbuilder');

const settings = require('./settings.json'); // File containing user settings
const logstream = fs.createWriteStream(settings.logFile, {flags:'a'});

process.on('uncaughtException', function(err) { // "Nice" Error handling, will obscure unknown errors, remove or comment for full debugging
	let isJSONErr = (err.toString().indexOf('Unexpected string in JSON') > -1 || err.toString().indexOf('Unexpected end of JSON input') > -1 || err.toString().indexOf('Unexpected token') > -1)
	if (err == "TypeError: JSON.parse(...).forEach is not a function") { // If this error
		fLog("ERROR > Failed to login please check your login credentials!")
		console.log('\u001b[41mERROR> Failed to login please check your login credentials!\u001b[0m') // Then print out what the user should do\
		settings.cookie = [];
		settings.cookies = {};
		saveSettings().then(restartScript());
	} if (err == "ReferenceError: thisChannel is not defined") {
		fLog(`ERROR > Error with "maxVideos"! Please set "maxVideos" to something other than ${settings.maxVideos} in settings.json`)
		console.log(`\u001b[41mERROR> Error with "maxVideos"! Please set "maxVideos" to something other than ${settings.maxVideos} in settings.json\u001b[0m`)
	} if(isJSONErr && err.toString().indexOf('partial.json') > -1) { // If this error and the error is related to this file
		logstream.write(`${Date()} == ERROR > partial.json > Corrupt partial.json file! Attempting to recover...`)
		console.log('\u001b[41mERROR> Corrupt partial.json file! Attempting to recover...\u001b[0m');
		fs.writeFile("./partial.json", '{}', 'utf8', function (error) { // Just write over the corrupted file with {}
			if (error) {
				logstream.write(`${Date()} == "+'ERROR > partial.json > Recovery failed! Error: ${error}\n`);
				console.log(`\u001b[41mRecovery failed! Error: ${error}\u001b[0m`)
				process.exit()
			} else {
				logstream.write(`${Date()} == ERROR > videos.json > Recovered! Restarting script...\n`);
				console.log('\u001b[42mRecovered! Restarting script...\u001b[0m');
				restartScript();
			}
		});
	} if(isJSONErr && err.toString().indexOf('videos.json') > -1) { // If this error and the error is related to this file
		logstream.write(`${Date()} == ERROR > videos.json > Corrupt videos.json file! Attempting to recover...`)
		console.log('\u001b[41mERROR> Corrupt videos.json file! Attempting to recover...\u001b[0m');
		try {
			videos = require('./videos.json.backup')
			saveVideoData();
			logstream.write(`${Date()} == ERROR > videos.json > Recovered from backup! Restarting script...`)
			console.log('\u001b[42mRecovered from backup! Restarting script...\u001b[0m');
			restartScript();
		} catch (error) {
			fs.writeFile("./videos.json", '{}', 'utf8', function (error) { // Just write over the corrupted file with {}
				if (error) {
					logstream.write(`${Date()} == ERROR > videos.json > Recovery failed! Error: ${error}`)
					console.log(`\u001b[41mRecovery failed! Error: ${error}\u001b[0m`)
					process.exit()
				} else {
					logstream.write(`${Date()} == ERROR > videos.json > Recovered! Restarting script...`)
					console.log('\u001b[42mRecovered! Restarting script...\u001b[0m');
					restartScript();
				}
			});
		}
	} else {
		console.log(err)
		logstream.write(`${Date()} == UNHANDLED ERROR > ${err}`)
		//throw err
	}
});

function restartScript() {
	// Spawn a new process of the script and pipe the output to the current cmd window
	const newProcess = spawn(`"${process.argv.shift()}"`, process.argv, {
		cwd: process.cwd(),
		detached : false,
		stdio: "inherit",
		shell: true
	});
	// Force the old process to only close after the new one has been created by putting it in a synchronous call
	if (!newProcess) process.exit();
}

// Check if videos file exists.
if (!fs.existsSync('./videos.json')) {
	// Create file
	fs.appendFile('./videos.json', '{}', function (err) {
		// Tell the user the script is restarting (with colors)
		fLog(`Pre-Init > videos.json does not exist! Created partial.json and restarting script...`)
		console.log('\u001b[33mCreated videos.json. Restarting script...\u001b[0m');
		// Restart here to avoid node trying to recover when it loads partial.json
		restartScript();
	});
}
// Put partial detection in a timeout to avoid it quitting before the videos check
setTimeout(function() {
	// Check if partial file exists.
	if (!fs.existsSync('./partial.json')) {
		// Create file
		fs.appendFile('./partial.json', '{}', function (err) {
			// Tell the user the script is restarting (with colors)
			fLog(`Pre-Init > partial.json does not exist! Created partial.json and restarting script...`)
			console.log('\u001b[33mCreated partial.json. Restarting script...\u001b[0m');
			// Restart here to avoid node trying to recover when it loads partial.json
			restartScript();
		});
	}
}, 100);


const videos = require('./videos.json'); // Persistant storage of videos downloaded

if (!fs.existsSync(settings.videoFolder)){ // Check if the new path exists (plus season folder if enabled)
	fs.mkdirSync(settings.videoFolder); // If not create the folder needed
}

function fLog(info) {
	if (settings.logging) logstream.write(Date()+" == "+info+'\n');
}

function debug(stringOut) {
	process.stdout.write(`\n\n\u001b[41mDEBUG>\u001b[0m   ${stringOut}\n\n`);
}

const subChannelIdentifiers = {
	"linus tech tips": [
		{
			title: 'Linus Tech Tips',
			check: null,
			type: 'description',
		},
		{
			title: 'Channel Super Fun', // subChannel display title
			check: 'https://twitter.com/channelsuperfun', // Text used to match against video description/title for subChannel identification MUST BE LOWERCASE
			type: 'description', // What to match the check against [description, title]
		},
		{
			title: 'Floatplane Exclusive',
			check: 'exclusive',
			type: 'title',
		},
		{
			title: 'TechLinked',
			check: 'tl:',
			type: 'title',
		},
		{
			title: 'TechQuickie',
			check: 'tq:',
			type: 'title',
		},
		{
			title: 'TalkLinked',
			check: 'talklinked',
			type: 'description'
		}
	],
	"ltt supporter (og)": [
		{
			title: 'Linus Tech Tips',
			check: null,
			type: 'description',
		},
		{
			title: 'Channel Super Fun', // subChannel display title
			check: 'https://twitter.com/channelsuperfun', // Text used to match against video description/title for subChannel identification MUST BE LOWERCASE
			type: 'description', // What to match the check against [description, title]
		},
		{
			title: 'Floatplane Exclusive',
			check: 'exclusive',
			type: 'title',
		},
		{
			title: 'TechLinked',
			check: 'tl:',
			type: 'title',
		},
		{
			title: 'TechQuickie',
			check: 'tq:',
			type: 'title',
		},
		{
			title: 'TalkLinked',
			check: 'talklinked',
			type: 'description'
		}
	],
	"ltt supporter (1080p)": [
		{
			title: 'Linus Tech Tips',
			check: null,
			type: 'description',
		},
		{
			title: 'Channel Super Fun', // subChannel display title
			check: 'https://twitter.com/channelsuperfun', // Text used to match against video description/title for subChannel identification MUST BE LOWERCASE
			type: 'description', // What to match the check against [description, title]
		},
		{
			title: 'Floatplane Exclusive',
			check: 'exclusive',
			type: 'title',
		},
		{
			title: 'TechLinked',
			check: 'tl:',
			type: 'title',
		},
		{
			title: 'TechQuickie',
			check: 'tq:',
			type: 'title',
		},
		{
			title: 'TalkLinked',
			check: 'talklinked',
			type: 'description'
		}
	]
}

var colourList = {
	'Linus Tech Tips': '\u001b[38;5;208m',
	'The WAN Show': '\u001b[38;5;208m',
	'Channel Super Fun': '\u001b[38;5;220m',
	'Floatplane Exclusive': '\u001b[38;5;200m',
	'TechLinked': '\u001b[38;5;14m',
	'TechQuickie': '\u001b[38;5;153m',
	'Tech Deals': '\u001b[38;5;10m',
	'BitWit Ultra': '\u001b[38;5;105m',
	'TalkLinked': '\u001b[36m'
}

// http://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html
// Colours Reference ^^

var episodeList = {}
var floatRequest = request.defaults({ // Sets the global requestMethod to be used, this maintains headers
	headers: {
		'User-Agent': `FloatplanePlex/${settings.version} (Inrix, +https://linustechtips.com/main/topic/859522-floatplane-download-plex-script-with-code-guide/)`
	},
	jar: true, // Use the same cookies globally
	rejectUnauthorized: false,
	followAllRedirects: true
})

if(process.platform === 'win32'){ // If not using windows attempt to use linux ffmpeg
	process.env.FFMPEG_PATH = "./node_modules/ffmpeg-binaries/bin/ffmpeg.exe"
} else {
	process.env.FFMPEG_PATH = "/usr/bin/ffmpeg"
}
var queueCount = -1; // Number of videos currently queued/downloading
var liveCount = 0; // Number of videos actually downloading
var bestEdge = {} // Variable used to store the best edge server determined by lat and long compared to the requesters ip address

files = glob.sync(process.env.FFMPEG_PATH) // Check if ffmpeg exists

if (files.length == -1) {
	fLog('ERROR > You need to install ffmpeg! Type "npm install ffmpeg-binaries" in console inside the script folder...')
	console.log('\u001b[41m You need to install ffmpeg! Refer to the installation instructions... Type "npm install ffmpeg-binaries" in console inside the script folder...\u001b[0m');
	process.exit()
}

// Finish Init, Sart Script

// Firstly check if there is a new version and notify the user
// Also check existing videos and update videos.json properly
checkExistingVideos();
floatRequest.get({ // Check if there is a newer version avalible for download
	url: 'https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/latest.json',
}, function (err, resp, body) {
	updateInfo = JSON.parse(body)
	if(updateInfo.version > settings.version) { // If the script is outdated
		fLog(`Pre-Init > New Version Avalible: v${updateInfo.version} | Update with update.bat!`)
		console.log(`\u001b[33mNew Version Avalible: v${updateInfo.version} | Update with update.bat!\u001b[0m`)
	} else if(updateInfo.version < settings.version) { // If the script is a beta version/nonpublic
		console.log('\u001b[35mOhh, your running a hidden beta! Spooky...\u001b[0m')
	}
	pureStart();
})

function pureStart() { // Global wrapper for starting the script
	fLog("\n\n\n=== Pre-Init > Started ===")
	// Earlybird functions, these are run before script start for things such as auto repeat and getting plex info
	getPlexToken().then(getPlexDetails).then(remotePlexCheck).then(repeatScript)
}

function checkExistingVideos () {
	Object.keys(videos).forEach(function (videoID) {
		if (videos[videoID].subChannel == "The WAN Show") {
			if (videos[videoID].partial) {
				if (fs.existsSync(videos[videoID].file)) fs.unlinkSync(videos[videoID].file);
				if (fs.existsSync(videos[videoID].artworkFile)) fs.unlinkSync(videos[videoID].artworkFile);
				if (fs.existsSync(videos[videoID].videoFile)) fs.unlinkSync(videos[videoID].videoFile);
				if (fs.existsSync(videos[videoID].audioFile)) fs.unlinkSync(videos[videoID].audioFile);
			}
			if (!fs.existsSync(videos[videoID].file) && !fs.existsSync(videos[videoID].videoFile) && !fs.existsSync(videos[videoID].audioFile)) { //  If the video does not exist remove it from videos.json
				delete videos[videoID];
				return;
			}
		}	else {
			if (!fs.existsSync(videos[videoID].file)) { //  If the video does not exist remove it from videos.json
				delete videos[videoID];
				return;
			}
			let video = fs.statSync(videos[videoID].file);
			if (videos[videoID].saved === true && video.size < 10000) delete videos[videoID]; // If the video is saved but its size is less than 10kb its failed and remove it.
			if (videos[videoID].partial) videos[videoID].transferred = video.size; // If the video is partially downloaded set its transferred size to its current size
		}
	});
}

function getPlexToken() { // If remoteplex is enabled then this asks the user for the plex username and password to generate a plexToken for remote refreshes
	return new Promise((resolve, reject) => {
		if (settings.remotePlexUpdates.enabled && settings.remotePlexUpdates.plexToken == "") {
			fLog("Plex-Init > Fetching Token")
			console.log('> Remote plex enabled! Fetching library access token...');
			console.log('> Please enter your plex login details:');
			prompt.start();
			prompt.get([{name: "Email/Username", required: true}, {name: "Password", required: true, hidden: true, replace: '*'}], function (err, result) {
				console.log('');
				request.post({ // Sends a post request to plex to generate the plexToken
					url: `https://plex.tv/users/sign_in.json?user%5Blogin%5D=${result['Email/Username']}&user%5Bpassword%5D=${result.Password}`,
					headers: {
						'X-Plex-Client-Identifier': "FDS",
						'X-Plex-Product': "Floatplane Download Script",
						'X-Plex-Version': "1"
					}
				}, function(err, resp, body){
					fLog("Plex-Init > Fetched Token")
					console.log('\u001b[36mFetched!\u001b[0m\n');
					settings.remotePlexUpdates.plexToken = JSON.parse(body).user.authToken
					resolve()
				})
			});
		} else if (settings.remotePlexUpdates.enabled && settings.remotePlexUpdates.plexToken != "") {
			fLog("Plex-Init > Using Saved Token")
			console.log("> Using saved plex token")
			resolve()
		} else {
			resolve()
		}
	})
}

function getPlexDetails() { // If remotePlex or localPlex is enabled and the section is the default "0" then ask the user for their section ID
	return new Promise((resolve, reject) => {
		if ((settings.remotePlexUpdates.enabled || settings.localPlexUpdates.enabled) && settings.plexSection == 0) {
			console.log('> Plex updates enabled! Please enter your plex section details, leave empty for defaults:');
			console.log('> Go to https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/settings.md for more info')
			prompt.start(); // This can either be the ID number or the url that links to the section in plex
			prompt.get([{name: "Floatplane Plex URL or Section ID", required: true}], function (err, result) {
				console.log('')
				settings.plexSection = result['Floatplane Plex URL or Section ID'].split('%2F').reverse()[0]
				resolve()
			});
		} else {
			resolve()
		}
	})
}

function remotePlexCheck() { // If remotePlex is enabled then this will ask the user for their plex server's IP and port numbers
	return new Promise((resolve, reject) => {
		if (settings.remotePlexUpdates.enabled && settings.remotePlexUpdates.serverIPAddr == "") {
			console.log("> Please enter your remote plex server's ip address and port:");
			console.log("> Leave port empty to use default")
			prompt.start();
			prompt.get([{name: "IP", required: true}, {name: "Port", required: false}], function (err, result) {
				settings.remotePlexUpdates.serverIPAddr = result.IP
				if (result.Port == "") {
					settings.remotePlexUpdates.serverPort = 32400
				} else {
					settings.remotePlexUpdates.serverPort = result.port
				}
				console.log('');
				resolve()
			});
		} else {
			resolve()
		}
	})
}

function repeatScript() {
	if (settings.autoFetchServer) findBestEdge();
	// Check if repeating the script is enabled in settings, if not then skip to starting the script
	if(settings.repeatScript != false && settings.repeatScript != 'false') {
		var multipliers = { // Contains the number of seconds for each time
			"s": 1,
			'm': 60,
			'h': 3600,
			'd': 86400,
			'w': 604800
		}
		var countDown = settings.repeatScript.slice(0, -1)*multiplier/60 // countDown is the number of minutes remaining until the script restarts
		var multiplier = multipliers[String(settings.repeatScript.slice(-1)).toLowerCase()] // This is the multiplier selected based on that the user states, eg 60 if they put m at the end
		fLog(`Init-Repeat > Script-Repeat Enabled! Repeating for ${settings.repeatScript} or ${settings.repeatScript.slice(0, -1)*multiplier} Seconds.`)
		console.log(`\u001b[41mRepeating for ${settings.repeatScript} or ${settings.repeatScript.slice(0, -1)*multiplier} Seconds.\u001b[0m`);
		start(); // Start the script for the first time
		setInterval(() => { // Set a repeating function that is called every 1000 miliseconds times the number of seconds the user picked
			fLog("Init-Repeat > Restarting!")
		 	start();
		}, settings.repeatScript.slice(0, -1)*multiplier*1000); // Re above
		setInterval(() => { // Set a repeating function that is called every 60 seconds to notify the user how long until a script run
			console.log(`${countDown} Minutes until script restarts...`);
			if(countDown > 0) {
				countDown-- // If countDown isnt 0 then drop the remaining minutes by 1
			} else {
				countDown = settings.repeatScript.slice(0, -1)*multiplier/60 // If it is 0 then the script has restarted so reset it
			}
		}, 60*1000);
	} else {
		start();
	}
}

function start() { // This is the main function that triggeres everything else in the script
	if (queueCount <= 0 && liveCount <= 0) {
		fLog("Init > Starting Main Functions")
		checkAuth().then(constructCookie).then(checkSubscriptions).then(parseKey).then(saveSettings).then(logEpisodeCount).then(getWAN).then(getVideos)
	} else { // If the script is busy downloading then wait for it to finish before continuing
		setTimeout(() => {
			queueCount = queueCount>0?queueCount-1:0
			liveCount = liveCount>0?liveCount-1:0
			start();
		}, 60*1000)
		fLog("Init > Script busy, delaying restart for 1 minute...")
	}
}

function printLines() { // Printout spacing for download bars based on the number of videos downloading
	return new Promise((resolve, reject) => {
		setTimeout(function(){
			console.log('\n'.repeat(((settings.maxParallelDownloads != -1) ? settings.maxParallelDownloads : queueCount)/2))
		},1500)
	})
}

function checkAuth(forced) { // Check if the user is authenticated
	return new Promise((resolve, reject) => {
		// Check if a proper method of authentication exists if not get the users login details
		if (forced || !settings.cookies.__cfduid && (!settings.user || !settings.password)) {
			console.log('> Please enter your login details:');
			prompt.start();
			prompt.get([{name: "Email/Username", required: true}, {name: "Password", required: true, hidden: true, replace: '*'}], function (err, result) {
				settings.user = result['Email/Username']
				settings.password = result.Password
				console.log('');
				doLogin().then(resolve) // After getting the users details get their session and log them in. Then finish.
			});
			// If they have no session but do have login details then just get their session log them in and finish.
		} else if((!settings.cookies.__cfduid && (settings.user || settings.password))) {
			doLogin().then(resolve)
		}	else {
			// They are already logged in with suficcent auth, just continue.
			fLog("Init-Auth > Using saved login data")
			console.log('> Using saved login data');
			resolve()
		}
	})
}

function doLogin() { // Login using the users credentials and save the cookies & session
	return new Promise((resolve, reject) => {
		authUrl = 'https://www.floatplane.com/api/auth/login'
		fLog(`Init-Login > Logging in as ${settings.user} via ${authUrl}`)
		console.log(`> Logging in as ${settings.user}`)
		floatRequest.post({
			method: 'POST',
			json: {
				username: settings.user,
				password: settings.password
			},
			url: authUrl,
			headers: {
				'accept': 'application/json'
			}
		}, function (error, resp, body) {
			if (body.needs2FA) { // If the server returns needs2FA then we need to prompt and enter a 2Factor code
				doTwoFactorLogin().then(resolve)
			} else if (body.user) { // If the server returns a user then we have logged in
				fLog(`Init-Login > Logged In as ${settings.user}!`)
				console.log(`\u001b[32mLogged In as ${settings.user}!\u001b[0m\n`);
				settings.cookies.__cfduid = resp.headers['set-cookie'][0]
				settings.cookies['sails.sid'] = resp.headers['set-cookie'][1]
				saveSettings().then(resolve) // Save the new session info so we dont have to login again and finish
			} else if (body.message != undefined) {
				console.log(`\u001b[41mERROR> ${body.message}\u001b[0m`);
				checkAuth(true).then(resolve)
			} else {
				fLog("Init-Login > There was a error while logging in...")
				console.log('\u001b[41mThere was a error while logging in...\u001b[0m\n');
				checkAuth(true).then(resolve) // Try to regain auth incase they entered the wrong details or their session is invalid
			}
		}, reject)
	})
}

function doTwoFactorLogin() {
	return new Promise((resolve, reject) => {
		factorUrl = 'https://www.floatplane.com/api/auth/checkFor2faLogin'
		console.log('> Please enter your 2 Factor authentication code:');
		prompt.start();
		prompt.get([{name: "2 Factor Code", required: true}], function (err, result) {
			floatRequest.post({
				method: 'POST',
				json: {
					token: result['2 Factor Code']
				},
				url: factorUrl,
				headers: {
					'accept': 'application/json'
				}
			}, function (error, resp, body) {
				if (body.user) { // If the server returns a user then we have logged in
					fLog(`Init-Login > Logged In as ${settings.user}!`)
					console.log(`\u001b[32mLogged In as ${settings.user}!\u001b[0m\n`);
					settings.cookies.__cfduid = resp.headers['set-cookie'][0]
					settings.cookies['sails.sid'] = resp.headers['set-cookie'][1]
					saveSettings().then(resolve) // Save the new session info so we dont have to login again and finish
				} else if (body.message != undefined) {
					console.log("\u001b[41mERROR> "+body.message+"\u001b[0m");
					doTwoFactorLogin().then(resolve);
				} else {
					fLog("Init-Login > There was a error while logging in...")
					console.log('\u001b[41mThere was a error while logging in...\u001b[0m\n');
					checkAuth(true).then(resolve) // Try to regain auth incase they entered the wrong details or their session is invalid
				}
			});
		});
	})
}

function constructCookie() { // Generate a array of cookies from the json object used to store them
	return new Promise((resolve, reject) => {
		settings.cookie = []
		for (k in settings.cookies) {
			settings.cookie.push(settings.cookies[k])
		}
		fLog("Init-Cookie > Cookie Constructed")
		console.log('> Cookie Constructed!');
		resolve()
	})
}

function saveSettings() { // Saves all the settings from the current settings object back to the settings.json file
	return new Promise((resolve, reject) => {
		console.log('> Saving settings');
		fs.writeFile("./settings.json", JSON.stringify(settings, null, 2), 'utf8', function (err) {
			if (err) reject(err)
			resolve()
		});
	})
}

function saveVideoData() { // Function for saving partial data, just writes out the variable to disk
	fs.writeFile("./videos.json", JSON.stringify(videos, null, 2), 'utf8', function (err) {
		if (err) console.log(err)
	});
}

function backupVideoData() { // Function for saving partial data, just writes out the variable to disk
	fs.writeFile("./videos.json.backup", JSON.stringify(videos, null, 2), 'utf8', function (err) {
		if (err) console.log(err)
	});
}


function logEpisodeCount(){ // Print out the current number of "episodes" for each subchannel
	return new Promise((resolve, reject) => {
		fLog("Post-Init > Printing episode count")
		console.log('\n\n=== \u001b[38;5;8mEpisode Count\u001b[0m ===')
		if (!settings.fileFormatting.ignoreFolderStructure) {
			fs.readdirSync(settings.videoFolder).forEach(function(channel){
				if (channel == 'artwork') { return false }
				episodeList[channel] = (glob.sync(`${settings.videoFolder}/${channel}/**/*.mp4`).length)
				if (channel.indexOf(".") == -1) { console.log(colourList[channel]+channel+'\u001b[0m:', episodeList[channel]) }
			})
		} else {
			glob.sync(`${settings.videoFolder}*.mp4`).forEach(function(video){
				if (video.indexOf('-') > -1) {
					if (!episodeList[video.slice(settings.videoFolder.length, video.indexOf(' -'))]) {
						episodeList[video.slice(settings.videoFolder.length, video.indexOf(' -'))] = 1
					}
					episodeList[video.slice(settings.videoFolder.length, video.indexOf(' -'))] += 1
				}
			})
			for (channel in episodeList) {
				if (channel.indexOf(".") == -1) { console.log(colourList[channel]+channel+'\u001b[0m:', episodeList[channel]) }
			}
			if (Object.keys(episodeList).length == 0) {
				console.log('> No Episodes Yet!')
			}
		}
		resolve()
	})
}

function checkSubscriptions() {
	return new Promise((resolve, reject) => {
		var subUrl = 'https://www.floatplane.com/api/user/subscriptions'
		fLog(`Init-Subs > Checking user subscriptions (${subUrl})`)

		// If this settings.json file is using the old format of storing subscriptions, convert it to the new one
		if (settings.subscriptions instanceof Array) {
			fLog("Init-Subs > Converting old Subs to new format")
			oldSubscriptions = settings.subscriptions;
			settings.subscriptions = {};
			// For each of the old subscriptions add them to the new subscriptions
			oldSubscriptions.forEach(function(subscription) {
				settings.subscriptions[subscription.id] = {
					id: subscription.id,
					title: subscription.title,
					enabled: subscription.enabled,
					ignore: subscription.ignore
				}
			})
		}
		floatRequest.get({ // Generate the key used to download videos
			headers: {
				Cookie: settings.cookie,
				'accept': 'application/json'
			},
			url: subUrl
		}, function (error, resp, body) {
			if (JSON.parse(body).length == 0) { // No subs were found - Most likely a issue with Floatplane
				fLog("Init-Subs > Floatplane returned no subscriptions! Keeping existing.")
				console.log('\u001b[31m> Floatplane returned no subscriptions! Keeping existing.\u001b[0m')
				return;
			} else {
				JSON.parse(body).forEach(function(subscription) {
					// If this subscription does not exist in settings add it with defaults otherwise do nothing
					if (settings.subscriptions[subscription.creator] == undefined) {
						// If the subscription being added is LTT then add it with its special subChannel ignores
						if (subscription.plan.title == 'Linus Tech Tips' || subscription.plan.title == 'LTT Supporter (OG)' || subscription.plan.title == 'LTT Supporter (1080p)') {
							settings.subscriptions[subscription.creator] = {
								id: subscription.creator,
								title: subscription.plan.title,
								enabled: true,
								ignore: {
									"Linus Tech Tips": false,
									"Channel Super Fun": false,
									"Floatplane Exclusive": false,
									"TechLinked": false,
									"Techquickie": false
								}
							}
						} else {
							settings.subscriptions[subscription.creator] = {
								id: subscription.creator,
								title: subscription.plan.title,
								enabled: true,
								ignore: {}
							}
						}
					}
				})
				fLog("Init-Subs > Updated user subscriptions")
				console.log('> Updated subscriptions!')
			}
			resolve()
		}, reject)
	})
}

function parseKey() { // Get the key used to download videos
	return new Promise((resolve, reject) => {
		var keyUrl = 'https://www.floatplane.com/api/video/url?guid=MSjW9s3PiG&quality=1080'
		fLog(`Init-Key > Fetching video download key (${keyUrl})`)
		console.log("> Fetching download key")
		floatRequest.get({
			url: keyUrl,
			headers: {
				Cookie: settings.cookie,
			}
		}, function (err, resp, body) {
			if (JSON.parse(body).message == "You must be logged-in to access this resource.") { // Check if key is invalid
				fLog("Init-Key > Key Invalid! Attempting to re-auth")
				console.log('\u001b[31mInvalid Key! Attempting to re-authenticate...\u001b[0m');
				settings.cookies.__cfduid = ''
				// If its invalid check authentication again, reconstruct the cookies and then try parsekey again if that goes through then resolve
				checkAuth().then(constructCookie).then(parseKey).then(resolve)
			} else {
				/*if (settings.autoFetchServer) {
					// Fetches the API url used to download videos
					settings.floatplaneServer = body.replace('floatplaneclub', 'floatplane').slice(1, body.lastIndexOf('floatplane')+14);
				}*/
				settings.key = body.replace(/.*wmsAuthSign=*/, '') // Strip everything except for the key from the generated url
				fLog("Init-Key > Key Fetched")
				console.log('\u001b[36mFetched download key!\u001b[0m');
				resolve()
			}
		});
	})
}

function findBestEdge() {
	return new Promise((resolve, reject) => {
		var edgeUrl = 'https://www.floatplane.com/api/edges'
		fLog(`Init-FindEdge > Fetching edge servers via (${edgeUrl})`)
		console.log("> Finding best edge server")
		floatRequest.get({
			url: edgeUrl,
			headers: {
				Cookie: settings.cookie,
			}
		}, function (err, resp, body) {
			var edgeInfo = JSON.parse(body);
			edgeInfo.edges.forEach(function(edge){
				if (!edge.allowDownload) return false;
				if (!bestEdge.edgeDistance) bestEdge = edge;
				edge.edgeDistance = edge.datacenter.latitude-edgeInfo.client.latitude+edge.datacenter.longitude-edgeInfo.client.longitude;
				if (edge.edgeDistance > bestEdge.edgeDistance) bestEdge = edge;
			})
			settings.floatplaneServer = `https://${bestEdge.hostname}`;
			console.log(`\n\u001b[36mFound! Using Server \u001b[0m[\u001b[38;5;208m${settings.floatplaneServer}\u001b[0m]`);
			resolve();
		});
	})
}


function getVideos() {
	return new Promise((resolve, reject) => {
		fLog("Videos-Init > Starting Main Function")
		Object.keys(settings.subscriptions).forEach(function(key) {
			var subscription = settings.subscriptions[key];
			if (!subscription.enabled) { // If this subscription is disabled then dont download
				fLog(`\nVideos-Init > ${subscription.title} is disabled, skipping`)
				return false
			}
			for(i=1; i <= Math.ceil(settings.maxVideos/20); i++){
				var vUrl = `https://www.floatplane.com/api/creator/videos?creatorGUID=${subscription.id}&fetchAfter=${((i*20)-20)}`
				fLog(`Videos-Init > Fetching ${vUrl}`)
				floatRequest.get({ // Generate the key used to download videos
					headers: {
						Cookie: settings.cookie,
					},
					url: vUrl
				}, function (error, resp, body) {
					fLog(`Videos-Init > Fetched ${vUrl}`)
					if (body == '[]') {
						fLog("Videos > No Video's Returned! Please open Floatplane.com in a browser and login...")
						console.log('\n\u001b[31mNo Videos Returned! Please open Floatplane.com in a browser and login...\u001b[0m')
					} else {
						// Determine the current page from the request uri
						var page = resp.request.uri.query.slice(resp.request.uri.query.indexOf('&fetchAfter=')+12, resp.request.uri.query.length)/20
						if(settings.maxVideos > 20) { // If the maxPages is more than 1 then log the === LinusTechTips === as === LinusTechTips - Page x ===
							console.log(`\n\n=== \u001b[38;5;8m${subscription.title}\u001b[0m - \u001b[95mPage ${page}\u001b[0m ===`)
						} else { // Otherwise just log it normally
							console.log(`\n\n=== \u001b[38;5;8m${subscription.title}\u001b[0m ===`)
						}
						JSON.parse(body).slice(0, settings.maxVideos+page*20).reverse().forEach(function(video, i) {
							// Set defaults for video
							video.subChannel = subscription.title
							video.releaseDate = new Date(video.releaseDate).toISOString().substring(0,10) // Make it nice

							/*
							/ Subchannel Matching
							*/
							if (subChannelIdentifiers[subscription.title.toLowerCase()]) {
								fLog(`Videos-Subs > Attempting to match "${video.title}" to a subChannel..."`)
								subChannelIdentifiers[subscription.title.toLowerCase()].forEach(function(subChannel){ // For each subChannel in a channel
									//console.log(video[subChannel.type].toLowerCase().indexOf(subChannel.check), subChannel.type, subChannel.check)
									if(video[subChannel.type].toLowerCase().indexOf(subChannel.check) > -1) { // Check if this video is part of a subchannel
										fLog(`Videos-Subs > Matched "${video.title}" to subChannel "${subChannel.title}"`)
										video.subChannel = subChannel.title
									}
								});
							}
							if (subscription.ignore[video.subChannel]) {
								fLog(`Videos-Subs > Subscription "${video.subChannel}" is set to ignore, skipping video "${video.title}"`)
								return false
							} // If this video is part of a subChannel we are ignoring then break

							video = doTitleFormatting(doPathChecks(video));

							if (!colourList[video.subChannel]) { colourList[video.subChannel] = '\u001b[38;5;153m' } // If this video's subchannel does not have a colour specified for its display, set a default
							if (i == 0 || i == Math.ceil(settings.maxVideos/20)) printLines() // Spacing for when downloads start

							if (videos[video.guid] == undefined){ // If this video does not exist in the videos.json meta then add it
								fLog(`Download-Init > "${video.title}" is new, creating meta in videos.json`)
								videos[video.guid] = { subChannel: video.subChannel, partial: false, saved: false }
							}

							if (!videos[video.guid].saved) { // If the video is not already downloaded
								episodeList[video.subChannel] += 1 // Increment the episode number for this subChannel

								if(settings.extras.downloadArtwork && video.thumbnail) { // If downloading artwork is enabled download it
									fLog(`Download-Init > Downloading "${video.title}" artwork`)
									floatRequest(video.thumbnail.path).pipe(fs.createWriteStream(video.rawPath+video.title+'.'+settings.extras.artworkFormat))
								} // Save the thumbnail with the same name as the video so plex will use it

								queueCount += 1 // Increase the queue count by 1
								video.url = `${settings.floatplaneServer}/Videos/${video.guid}/${settings.video_res}.mp4?wmsAuthSign=${settings.key}`;

								saveVideoData();

								if (liveCount < settings.maxParallelDownloads || settings.maxParallelDownloads == -1) { // If we havent hit the maxParallelDownloads or there isnt a limit then download
									if (videos[video.guid].partial) process.stdout.write(`${colourList[video.subChannel]}>-- \u001b[0m${video.title} == \u001b[38;5;226mRESUMING DOWNLOAD\u001b[0m`);
									else process.stdout.write(`${colourList[video.subChannel]}>-- \u001b[0m${video.title} == \u001b[34mDOWNLOADING\u001b[0m`);
									downloadVideo(video) // Download the video
								} else { // Otherwise add to queue
									if (videos[video.guid].partial) process.stdout.write(`${colourList[video.subChannel]}>-- \u001b[0m${video.title} == \u001b[35mQUEUED \u001b[38;5;226mRESUME\u001b[0m`);
									else process.stdout.write(`${colourList[video.subChannel]}>-- \u001b[0m${video.title} == \u001b[35mQUEUED\u001b[0m`);
									queueDownload(video) // Queue
								}

								if (settings.extras.saveNfo) {
									fLog(`Download-Init > Saving "${video.title}".nfo`)
                  let doc = builder.create('episodedetails').ele('title').text(video.shortTitle).up().ele('showtitle').text(video.subChannel).up().ele('description').text(video.description).up().ele('aired').text(video.releaseDate).up().ele('season').text(video.seasonNumber).up().ele('episode').text(video.episodeNumber).up().end({pretty: true});
                  fs.writeFile(video.rawPath + video.title + '.nfo', doc, 'utf8', function (error) {
										fLog(`Download-Init > Error Saving "${video.title}".nfo!! ${error}`)
									});
                }

							} else {
								fLog(`Videos > Video "${video.title}" exist's skipping`)
								console.log(`${colourList[video.subChannel]}${video.subChannel}\u001b[0m> ${video.title} == \u001b[32mEXISTS\u001b[0m`);
							}
						})
					}
				})
			}
		})
	})
}

function queueDownload(video) { // Loop until current downloads is less than maxParallelDownloads and then download
	setTimeout(function(){
		if (liveCount < settings.maxParallelDownloads) {
			downloadVideo(video)
		} else {
			queueDownload(video) // Run this function again continuing the loop
		}
	}, 500)
}

function doTitleFormatting(video) {
	/*
	/ Title Formatting
	*/
	if (settings.fileFormatting.countFromOne) episodeList[video.subChannel] += 1;

	video.shortTitle = video.title;
	video.episodeNumber = episodeList[video.subChannel] ? episodeList[video.subChannel] : 0;

	if (!episodeList[video.subChannel]) { episodeList[video.subChannel] = 0 } // If this subchannel does not exist in the episodeList then create one and set it to 0
	if (settings.fileFormatting.formatWithEpisodes == true) { video.title = `S${video.seasonNumber}E${(video.episodeNumber)} - ${video.title}` } // Add Episode Number
	if (settings.fileFormatting.formatWithDate == true) { video.title = `${video.releaseDate} - ${video.title}` } // Add the upload date to the filename
	if (settings.fileFormatting.formatWithSubChannel == true) { video.title = `${video.subChannel} - ${video.title}` } // Add subChannel naming if requested

	video.title = sanitize(video.title);

	return video;
}

function doPathChecks(video) {
	/*
	/ Video Folder checks & generation
	*/
	var rawPath = settings.videoFolder+video.subChannel+'/' // Create the rawPath variable that stores the path to the file

	if (settings.fileFormatting.ignoreFolderStructure) { rawPath = settings.videoFolder } // If we are ignoring folder structure then set the rawPath to just be the video folder
	if (!fs.existsSync(settings.videoFolder)) { // If the root video folder dosnt exist create it
		fLog(`Videos-FileSystem > "${settings.videoFolder}" doesn't exit... Creating`)
		fs.mkdirSync(settings.videoFolder)
	}
	if (!fs.existsSync(rawPath)){ // Check if the first path exists (minus season folder)
		fLog(`Videos-FileSystem > "${rawPath}" doesn't exit... Creating`)
		fs.mkdirSync(rawPath); // If not create the folder needed
	}

	/*
	/ Special folder formatting
	*/
	var seasonNumber = '01' // Set the season number to use if nothing special is being done to seasons
	if(settings.fileFormatting.monthsAsSeasons) { // If your formatting the videos with the YEAR+MONTH as the season then
		var date = new Date(video.releaseDate) // Generate a new date from the publish date pulled above
		if(date.getMonth() < 10) { // If the month is less than 10 add a 0 to it
			var seasonNumber = date.getFullYear()+'0'+date.getMonth() // Set the seasonNumber to be the YEAR+MONTH, eg 201801
			rawPath = rawPath + seasonNumber+'/' // Set the raw path to include the new season folder
		} else {
			var seasonNumber = date.getFullYear()+date.getMonth()
			rawPath = rawPath + seasonNumber+'/'
		}
	} else if(settings.fileFormatting.yearsAsSeasons) { // If your formatting the videos with the YEAR as the season then
		var date = new Date(video.releaseDate)
		var seasonNumber = date.getFullYear() // Set the seasonNumber to be the YEAR, eg 2018
		rawPath = rawPath + date.getFullYear()+'/'
	}
	if (!fs.existsSync(rawPath)){ // Check if the new path exists (plus season folder if enabled)
		fLog(`Videos-FileSystem > "${rawPath}" doesn't exit... Creating`)
		fs.mkdirSync(rawPath); // If not create the folder needed
	}

	video.rawPath = rawPath;
	video.seasonNumber = seasonNumber;

	return video;
}

function getWAN() {
	return new Promise((resolve, reject) => {
		if (!settings.TheWANShow.enabled) {
      resolve();
      return;
    }
		fLog(`WAN-Init > Fetching LTT youtube videos...`)
		floatRequest.get({ // Generate the key used to download videos
			url: "https://www.youtube.com/user/LinusTechTips/videos"
		}, function (error, resp, body) {
			fLog(`WAN-Init > Searching videos for WAN...`)
			let $ = cheerio.load(body);
			$('a').filter(function() {
				if ($(this).text().indexOf('WAN') > -1) { // If the element contains the text WAN and is not already downloaded
					fLog(`WAN > Found "${$(this).text()}"`);
					if (!(videos[$(this).attr("href")]||{}).saved) {
						let video = { subChannel: "The WAN Show", title: $(this).text(), url: $(this).attr('href') };
						episodeList[video.subChannel] += 1 // Increment the episode number for this subChannel
						video = doTitleFormatting(doPathChecks(video));
						if (settings.TheWANShow.downloadArtwork) { // If downloading artwork is enabled download it
							fLog(`WAN > Downloading "${video.title}" artwork`)
							floatRequest(`https://i.ytimg.com/vi/${ytdl.getVideoID(video.url)}/hqdefault.jpg`).pipe(fs.createWriteStream(video.rawPath+video.title+'.'+settings.extras.artworkFormat))
						} // Save the thumbnail with the same name as the video so plex will use it
						downloadYoutube(video);
					} else {
						fLog(`WAN > "${$(this).text()}" Exists, Skipping!`);
						console.log(`${colourList["The WAN Show"]}The Wan Show \u001b[38;5;196mYT\u001b[0m> ${$(this).text()} == \u001b[32mEXISTS\u001b[0m`);
					}
				}
			}).next();
			resolve();
		});
	});
}

function downloadYoutube(video) {
	liveCount += 1;

	let videoPart = video.rawPath+video.title+'.video.mp4';
	let audioPart = video.rawPath+video.title+'.audio.mp3';

	let displayTitleVideo = pad(`${colourList[video.subChannel]}${video.subChannel}\u001b[38;5;196m YT-Video>\u001b[0m${video.shortTitle.slice(0,25)}`, 36) // Set the title for being displayed and limit it to 25 characters
	let displayTitleAudio = pad(`${colourList[video.subChannel]}${video.subChannel}\u001b[38;5;196m YT-Audio>\u001b[0m${video.shortTitle.slice(0,25)}`, 36) // Set the title for being displayed and limit it to 25 characters

	ytdl.getInfo(video.url, (err, info) => {
		video.description = info.description;
		video.releaseDate = new Date(info.published);
		videos[video.url] = {
			file: video.rawPath+video.title+'.mp4', // Specifies where the video is saved,
			videoFile: videoPart,
			audioFile: audioPart,
			artworkFile: video.rawPath+video.title+'.'+settings.extras.artworkFormat,
			partial: true,
			subChannel: video.subChannel,
			releaseDate: new Date(info.published)
		}
		saveVideoData();
	  if (err) fLog(`WAN > ytdl > An error occoured for "${video.title}": ${err}`)
		let videoThreadPromises = [];
		let audioThreadPromises = [];

		let videoDisplayInterval = null;
		let audioDisplayInterval = null;

	  let bestAudio = ytdl.chooseFormat(ytdl.filterFormats(info.formats, 'audioonly'), { quality: settings.TheWANShow.audio.quality });
		let bestVideo = ytdl.chooseFormat(ytdl.filterFormats(info.formats, 'videoonly'), { quality: settings.TheWANShow.video.quality });

		let cLenVideo = bestVideo.clen/settings.TheWANShow.downloadThreads;
		let cLenAudio = bestAudio.clen/settings.TheWANShow.downloadThreads;

		let videoState = {
			transferred: [0],
			speed: [0],
			total: [0],
			timeRemaining: [0]
		};
		let audioState = {
			transferred: [0],
			speed: [0],
			total: [0],
			timeRemaining: [0]
		};

		let videoBar = multi.newBar(':title [:bar] :percent :stats', { // Format with ffmpeg for titles/plex support
			complete: '\u001b[42m \u001b[0m',
			incomplete: '\u001b[41m \u001b[0m',
			width: 30,
			total: 100
		})
		let audioBar = multi.newBar(':title [:bar] :percent :stats', { // Format with ffmpeg for titles/plex support
			complete: '\u001b[42m \u001b[0m',
			incomplete: '\u001b[41m \u001b[0m',
			width: 30,
			total: 100
		})

		if (settings.TheWANShow.audio.saveSeperately || settings.TheWANShow.combineAndSaveAudioVideo) {
			for(let i = 0; i < settings.TheWANShow.downloadThreads; i++) {
				audioThreadPromises.push(
					new Promise(function(resolve, reject){
						progress(request({
							url: bestAudio.url,
							headers: {
								Range: `bytes=${Math.floor(cLenAudio*i)}-${Math.floor(((cLenAudio*i)+cLenAudio))}`
							}
						}), { throttle: 250 }).on('progress', function (state) { // Run the below code every downloadUpdateTime while downloading
							audioState.transferred[i] = state.size.transferred;
							audioState.speed[i] = state.speed;
							audioState.total[i] = state.size.total;
							audioState.timeRemaining[i] = state.time.remaining;
						}).on('end', function () { resolve(); }).pipe(fs.createWriteStream(audioPart, { start: Math.floor(cLenAudio*i), flags: 'w+' })).on('finish', function(){});
					})
				);
			}
		}

		if (settings.TheWANShow.video.saveSeperately || settings.TheWANShow.combineAndSaveAudioVideo) {
			for(let i = 0; i < settings.TheWANShow.downloadThreads; i++) {
				videoThreadPromises.push(
					new Promise(function(resolve, reject){
						progress(request({
							url: bestVideo.url,
							headers: {
								Range: `bytes=${Math.floor(cLenVideo*i)}-${Math.floor(((cLenVideo*i)+cLenVideo))}`
							}
						}), { throttle: 250 }).on('progress', function (state) { // Run the below code every downloadUpdateTime while downloading
							videoState.transferred[i] = state.size.transferred;
							videoState.speed[i] = state.speed;
							videoState.total[i] = state.size.total;
							videoState.timeRemaining[i] = state.time.remaining;
						}).on('end', function () { resolve(); }).pipe(fs.createWriteStream(videoPart, { start: Math.floor(cLenVideo*i), flags: 'w+' })).on('finish', function(){});
					})
				);
			}
		}

		if (settings.TheWANShow.video.saveSeperately || settings.TheWANShow.combineAndSaveAudioVideo) videoDisplayInterval = setInterval(function(){
			let videoSum = {
				transferred: videoState.transferred.reduce((a, b) => a+b),
				speed: videoState.speed.reduce((a, b) => a+b),
				total: videoState.total.reduce((a, b) => a+b),
				timeRemaining: videoState.timeRemaining.reduce((a, b) => a+b)
			}
			if (videoSum.speed == null) {videoSum.speed = 0} // If the speed is null set it to 0
			videoBar.update(videoSum.transferred/videoSum.total) // Update the bar's percentage with a manually generated one as we cant use progresses one due to this being a partial download
			videoBar.tick({'title': displayTitleVideo, 'stats': `${(((videoSum.speed)/1024000)).toFixed(2)}MB/s ${(((videoSum.transferred)/1024000)).toFixed(0)}/${(videoSum.total/1024000).toFixed(0)}MB ETA: ${Math.floor(videoSum.timeRemaining/60)}m ${Math.floor(videoSum.timeRemaining)%60}s`})
		}, settings.downloadUpdateTime)

		if (settings.TheWANShow.audio.saveSeperately || settings.TheWANShow.combineAndSaveAudioVideo) audioDisplayInterval = setInterval(function(){
			let audioSum = {
				transferred: audioState.transferred.reduce((a, b) => a+b),
				speed: audioState.speed.reduce((a, b) => a+b),
				total: audioState.total.reduce((a, b) => a+b),
				timeRemaining: audioState.timeRemaining.reduce((a, b) => a+b)
			}
			if (audioSum.speed == null) {audioSum.speed = 0} // If the speed is null set it to 0
			audioBar.update(audioSum.transferred/audioSum.total) // Update the bar's percentage with a manually generated one as we cant use progresses one due to this being a partial download
			audioBar.tick({'title': displayTitleAudio, 'stats': `${(((audioSum.speed)/1024000)).toFixed(2)}MB/s ${(((audioSum.transferred)/1024000)).toFixed(0)}/${(audioSum.total/1024000).toFixed(0)}MB ETA: ${Math.floor(audioSum.timeRemaining/60)}m ${Math.floor(audioSum.timeRemaining)%60}s`})
		}, settings.downloadUpdateTime)

		Promise.all(audioThreadPromises).then(() => {
			clearInterval(audioDisplayInterval);
			if (settings.TheWANShow.audio.saveSeperately || settings.TheWANShow.combineAndSaveAudioVideo) {
				audioBar.update(1) // Set the progress bar to 100%
				audioBar.tick({'title': displayTitleAudio, 'stats': `${(bestAudio.clen/1024000).toFixed(0)}/${(bestAudio.clen/1024000).toFixed(0)}MB`})
				audioBar.terminate();
			}
			Promise.all(videoThreadPromises).then((values) => {
			  clearInterval(videoDisplayInterval);
				if (settings.TheWANShow.video.saveSeperately || settings.TheWANShow.combineAndSaveAudioVideo) {
					videoBar.update(1) // Set the progress bar to 100%
					videoBar.tick({'title': displayTitleVideo, 'stats': `${(bestVideo.clen/1024000).toFixed(0)}/${(bestVideo.clen/1024000).toFixed(0)}MB`})
					videoBar.terminate();
				}
				if (settings.TheWANShow.combineAndSaveAudioVideo) {
					ffmpeg()
					.input(videoPart)
					.videoCodec('copy')
		      .input(audioPart)
		      .audioCodec('copy')
					.outputOptions("-metadata", "title="+video.shortTitle, "-metadata", "AUTHOR="+video.subChannel, "-metadata", "YEAR="+Date(video.releaseDate), "-metadata", "description="+video.description, "-metadata", "synopsis="+video.description, "-strict", "-2")
					.saveToFile(videos[video.url].file)
					.on('error', function(err, stdout, stderr) { // Add title metadata
						fLog(`ffmpeg > An error occoured for "${video.title}": ${err}`)
					}).on('end', () => {
						liveCount -= 1;
						videos[video.url].partial = false;
						videos[video.url].saved = true;
						saveVideoData();
						if(queueCount == -1) {
							updateLibrary(); // If we are at the last video then run a plex collection update
							backupVideoData();
						}
			      if (!settings.TheWANShow.audio.saveSeperately) fs.unlink(audioPart, err => {
			        if(err) {
								fLog(`[1024] WAN > ffmpeg > An error occoured while unlinking "${audioPart}": ${err}`)
								console.log(`[1025] An error occoured while unlinking "${audioPart}": ${err}`)
							}
			      });
						if (!settings.TheWANShow.video.saveSeperately) fs.unlink(videoPart, err => {
			        if(err) {
								fLog(`[1030] WAN > ffmpeg > An error occoured while unlinking "${videoPart}": ${err}`)
								console.log(`[1031] An error occoured while unlinking "${videoPart}": ${err}`)
							}
			      });
			    });
				} else {
					liveCount -= 1;
					videos[video.url].partial = false;
					videos[video.url].saved = true;
					saveVideoData();
					if(queueCount == -1) {
						updateLibrary(); // If we are at the last video then run a plex collection update
						backupVideoData();
					}
				}
			});
		});
	});
}

function downloadVideo(video) { // This handles resuming downloads, its very similar to the download function with some changes
	liveCount += 1;
	let total = videos[video.guid].size ? videos[video.guid].size : 0 // // Set the total size to be equal to the stored total or 0
	let previousTransferred = videos[video.guid].transferred ? videos[video.guid].transferred : 0; // Set previousTransferred as the previous ammount transferred or 0
	let fileOptions = { start: previousTransferred, flags: videos[video.guid].file ? 'r+' : 'w' };
	let displayTitle = '';
	if (videos[video.guid].partial) { // If this video was partially downloaded
		fLog(`Resume > Resuming download for "${video.title}`)
		displayTitle = pad(`${colourList[video.subChannel]}${video.subChannel}\u001b[0m> ${video.shortTitle.slice(0,35)}`, 36) // Set the title for being displayed and limit it to 25 characters
	} else {
		fLog(`Download > Downloading "${video.title}"`)
		displayTitle = pad(`${colourList[video.subChannel]}${video.subChannel}\u001b[0m> ${video.shortTitle.slice(0,25)}`, 29) // Set the title for being displayed and limit it to 25 characters
	}
	let bar = multi.newBar(':title [:bar] :percent :stats', { // Create a new loading bar
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
		bar.update((previousTransferred+state.size.transferred)/videos[video.guid].size) // Update the bar's percentage with a manually generated one as we cant use progresses one due to this being a partial download
		// Tick the bar same as above but the transferred value needs to take into account the previous amount.
		bar.tick({'title': displayTitle, 'stats': `${((state.speed/100000)/8).toFixed(2)}MB/s ${((previousTransferred+state.size.transferred)/1024000).toFixed(0)}/${((previousTransferred+state.size.total)/1024000).toFixed(0)}MB ETA: ${Math.floor(state.time.remaining/60)}m ${Math.floor(state.time.remaining)%60}s`})
		total = (previousTransferred+state.size.total/1024000).toFixed(0) // Update Total for when the download finishes
		//savePartialData(); // Save this data
	}).on('error', function(err, stdout, stderr) { // On a error log it
		if (videos[video.guid].partial) fLog(`Resume > An error occoured for "${video.title}": ${err}`)
		else fLog('Download > An error occoured for "'+video.title+'": '+err)
		console.log(`An error occurred: ${err.message} ${err} ${stderr}`);
	}).on('end', function () { // When done downloading
		fLog(`Download > Finished downloading: "${video.title}"`)
		bar.update(1) // Set the progress bar to 100%
		// Tick the progress bar to display the totalMB/totalMB
		bar.tick({'title': displayTitle, 'stats': `${(total/1024000).toFixed(0)}/${(total/1024000).toFixed(0)}MB`})
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

function ffmpegFormat(temp_file, video) { // This function adds titles to videos using ffmpeg for compatibility with plex
	if (settings.ffmpeg) {
		fLog(`ffmpeg > Beginning ffmpeg title formatting for "${video.title}"`)
		ffmpeg(videos[video.guid].file).outputOptions("-metadata", "title="+video.shortTitle, "-metadata", "AUTHOR="+video.subChannel, "-metadata", "YEAR="+Date(video.releaseDate), "-metadata", "description="+video.description, "-metadata", "synopsis="+video.description, "-c:a", "copy", "-c:v", "copy")
		.saveToFile(temp_file)
		.on('error', function(err, stdout, stderr) { // Add title metadata
			setTimeout(function(){ // If the formatting fails, wait a second and try again
				fLog(`ffmpeg > An error occoured for "${video.title}": ${err} Retrying...`)
				if(err){ffmpegFormat(videos[video.guid].file, video.shortTitle, temp_file, video)}
			}, 1000)
		}).on('end', function() { // Save the title in metadata
			fs.rename(temp_file, videos[video.guid].file, function() {
				liveCount -= 1;
				if(queueCount == -1) {
					updateLibrary(); // If we are at the last video then run a plex collection update
					backupVideoData();
				}
				fLog(`ffmpeg > Renamed "${temp_file}" to "${videos[video.guid].file}"`)
			})
		})
	}
	if (!video.guid) video.guid = video.url;
	if (!videos[video.guid]) videos[video.guid] = {};
	videos[video.guid].saved = true // Set it to be saved
	saveVideoData();
	fLog(`Download > Updated VideoStore for video "${video.title}"`)
}

function updateLibrary() { // Function for updating plex libraries
	return new Promise((resolve, reject) => {
		if(settings.localPlexUpdates.enabled) { // Run if local plex is enabled
			fLog("PlexUpdate > Updating Plex Section")
			spawn(settings.localPlexUpdates.plexScannerInstall,	['--scan', '--refresh', '--force', '--section', settings.plexSection]); // Run the plex update command
		}
		if (settings.remotePlexUpdates.enabled) { // Run if remote plex is enabled
			fLog("PlexUpdate > Updating Plex Section")
			request({ // Sends a request to update the remote library using the servers ip, port, section and plexToken
				url: `http://${settings.remotePlexUpdates.serverIPAddr}:${settings.remotePlexUpdates.serverPort}/library/sections/${settings.plexSection}/refresh?X-Plex-Token=${settings.remotePlexUpdates.plexToken}`,
			}, function(err, resp, body){
				if (body.indexOf('404') > -1) { // If result is 404 then the section probably dosnt exist
					fLog("PlexUpdate > ERR: Cannot refresh... Invalid library section defined in settings!")
					console.log('\u001b[41m> remotePlex ERR: Cannot refresh... Invalid library section defined in settings!\u001b[0m')
				} else {
					fLog("PlexUpdate > Refreshed Plex Section")
					console.log('\u001b[38;5;226m> Refreshed plex section!\u001b[0m')
				}
			})
		}
		resolve()
	})
}
