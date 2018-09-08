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
const AdmZip = require('adm-zip');

const settings = require('./settings.json'); // File containing user settings
const logstream = fs.createWriteStream(settings.logFile, {flags:'a'});

process.on('uncaughtException', function(err) { // "Nice" Error handling, will obscure unknown errors, remove or comment for full debugging
	if (err == "TypeError: JSON.parse(...).forEach is not a function") { // If this error
		fLog("ERROR > Failed to login please check your login credentials!")
		console.log('\u001b[41mERROR> Failed to login please check your login credentials!\u001b[0m') // Then print out what the user should do
	} if (err == "ReferenceError: thisChannel is not defined") {
		fLog('ERROR > Error with "maxVideos"! Please set "maxVideos" to something other than '+settings.maxVideos+' in settings.json')
		console.log('\u001b[41mERROR> Error with "maxVideos"! Please set "maxVideos" to something other than '+settings.maxVideos+' in settings.json\u001b[0m')
	} if(err.toString().indexOf('Unexpected end of JSON input') > -1 && err.toString().indexOf('partial.json') > -1) { // If this error and the error is related to this file
		logstream.write(Date()+" == "+'ERROR > partial.json > Corrupt partial.json file! Attempting to recover...')
		console.log('\u001b[41mERROR> Corrupt partial.json file! Attempting to recover...\u001b[0m');
		fs.writeFile("./partial.json", '{}', 'utf8', function (error) { // Just write over the corrupted file with {}
			if (error) {
				logstream.write(Date()+" == "+'ERROR > partial.json > Recovery failed! Error: '+error+'\n');
				console.log('\u001b[41mRecovery failed! Error: '+error+'\u001b[0m')
				process.exit()
			} else {
				logstream.write(Date()+" == "+'ERROR > videos.json > Recovered! Restarting script...\n');
				console.log('\u001b[42mRecovered! Restarting script...\u001b[0m');
				pureStart();
			}
		});
	} if(err.toString().indexOf('Unexpected string in JSON') > -1 && err.toString().indexOf('videos.json') > -1) { // If this error and the error is related to this file
		logstream.write(Date()+" == "+'ERROR > videos.json > Corrupt videos.json file! Attempting to recover...')
 		console.log('\u001b[41mERROR> Corrupt videos.json file! Attempting to recover...\u001b[0m');
 		fs.writeFile("./videos.json", '{}', 'utf8', function (error) { // Just write over the corrupted file with {}
 			if (error) {
 				logstream.write(Date()+" == "+'ERROR > videos.json > Recovery failed! Error: '+error)
 				console.log('\u001b[41mRecovery failed! Error: '+error+'\u001b[0m')
 				process.exit()
 			} else {
 				logstream.write(Date()+" == "+'ERROR > videos.json > Recovered! Restarting script...')
 				console.log('\u001b[42mRecovered! Restarting script...\u001b[0m');
 				pureStart();
 			}
 		});
 	} else {
		console.log(err)
		logstream.write(Date()+" == "+"UNHANDLED ERROR > "+err)
		//throw err
	}
});

const videos = require('./videos.json'); // Persistant storage of videos downloaded
const partial_data = require('./partial.json'); // File for saving details of partial downloads

if (!fs.existsSync(settings.videoFolder)){ // Check if the new path exists (plus season folder if enabled)
	fs.mkdirSync(settings.videoFolder); // If not create the folder needed
}

function fLog(info) {
	logstream.write(Date()+" == "+info+'\n');
}

const subChannelIdentifiers = {
	"Linus Tech Tips": [
		{
			title: 'Linus Tech Tips',
			check: null,
			type: 'description',
		},
		{
			title: 'Channel Super Fun',
			check: 'https://twitter.com/channelsuperfun',
			type: 'description',
		},
		{
			title: 'Floatplane Exclusive',
			check: 'exclusive',
			type: 'title',
		},
		{
			title: 'TechLinked',
			check: 'http://twitter.com/techlinkedyt',
			type: 'description',
		},
		{
			title: 'Techquickie',
			check: 'http://twitter.com/jmart604',
			type: 'description',
		}
	]
}

colourList = {
	'Linus Tech Tips': '\u001b[38;5;208m',
	'Channel Super Fun': '\u001b[38;5;220m',
	'Floatplane Exclusive': '\u001b[38;5;200m',
	'TechLinked': '\u001b[38;5;14m',
	'Techquickie': '\u001b[38;5;153m',
	'Tech Deals': '\u001b[38;5;10m',
	'BitWit Ultra': '\u001b[38;5;105m'
}

// http://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html
// Colours Reference ^^

var episodeList = {}

var floatRequest = request.defaults({ // Sets the global requestMethod to be used, this maintains headers
    headers: {
    	'User-Agent': "FloatplanePlex/"+settings.version+" (Inrix, +https://linustechtips.com/main/topic/859522-floatplane-download-plex-script-with-code-guide/)"
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
var loadCount = -1; // Number of videos currently queued/downloading
var liveCount = 0; // Number of videos actually downloading
var updatePlex = false; // Defaults to false, and should stay false. This is automatically set to true when the last video is downloaded

files = glob.sync("./node_modules/ffmpeg-binaries/bin/ffmpeg.exe") // Check if the video already exists based on the above match
if (files.length == -1) {
	fLog('ERROR > You need to install ffmpeg! Type "npm install ffmpeg-binaries" in console inside the script folder...')
	console.log('\u001b[41m You need to install ffmpeg! Type "npm install ffmpeg-binaries" in console inside the script folder...\u001b[0m');
	process.exit()
}

// Finish Init, Sart Script

// Firstly check if there is a new version and notify the user
floatRequest.get({ // Check if there is a newer version avalible for download
	url: 'https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/latest.json',
}, function (err, resp, body) {
	updateInfo = JSON.parse(body)
	if(updateInfo.version > settings.version) { // If the script is outdated
		fLog("Pre-Init > "+'New Version Avalible: v'+updateInfo.version+' | Update with update.bat!')
		console.log('\u001b[33mNew Version Avalible: v'+updateInfo.version+' | Update with update.bat!\u001b[0m')
	} else if(updateInfo.version < settings.version) { // If the script is a beta version/nonpublic
		console.log('\u001b[35mOhh, your running a hidden beta! Spooky...\u001b[0m')
	}
})

pureStart();
checkExistingVideos();

function pureStart() { // Global wrapper for starting the script
	fLog("\n\n\n=== Pre-Init > Started ===")
	// Earlybird functions, these are run before script start for things such as auto repeat and getting plex info
	getPlexToken().then(getPlexDetails).then(remotePlexCheck).then(repeatScript)
}

function checkExistingVideos() {
	Object.keys(videos).forEach(function(key) {
		if (videos[key].saved == true && !fs.existsSync(videos[key].file)){ // Check if the video still exists
			delete videos[key]
		}
	});
}

function getPlexToken() { // If remoteplex is enabled then this asks the user for the plex username and password to generate a plexToken for remote refreshes
	return new Promise((resolve, reject) => {
		if (settings.remotePlex && settings.plexToken == "") {
			fLog("Plex-Init > Fetching Token")
			console.log('> Remote plex enabled! Fetching library access token...');
			console.log('> Please enter your plex login details:');
			prompt.start();
			prompt.get([{name: "Email/Username", required: true}, {name: "Password", required: true, hidden: true, replace: '*'}], function (err, result) {
				console.log('');
				request.post({ // Sends a post request to plex to generate the plexToken
					url: 'https://plex.tv/users/sign_in.json?user%5Blogin%5D='+result['Email/Username']+'&user%5Bpassword%5D='+result.Password,
					headers: {
						'X-Plex-Client-Identifier': "FDS",
						'X-Plex-Product': "Floatplane Download Script",
						'X-Plex-Version': "1"
					}
				}, function(err, resp, body){
					fLog("Plex-Init > Fetched Token")
					console.log('\u001b[36mFetched!\u001b[0m\n');
					settings.plexToken = JSON.parse(body).user.authToken
					resolve()
				})
			});
		} else if (settings.remotePlex && settings.plexToken != "") {
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
		if ((settings.remotePlex || settings.localPlex) && settings.plexSection == 0) {
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
		if (settings.remotePlex && settings.remotePlexIP == "") {
			console.log("> Please enter your remote plex server's ip address and port:");
			console.log("> Leave port empty to use default")
			prompt.start();
			prompt.get([{name: "IP", required: true}, {name: "Port", required: false}], function (err, result) {
				settings.remotePlexIP = result.IP
				if (result.Port == "") {
					settings.remotePlexPort = 32400
				} else {
					settings.remotePlexPort = result.port
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
		fLog("Init-Repeat > Script-Repeat Enabled! "+'Repeating for '+settings.repeatScript+' or '+settings.repeatScript.slice(0, -1)*multiplier+' Seconds.')
		console.log('\u001b[41mRepeating for '+settings.repeatScript+' or '+settings.repeatScript.slice(0, -1)*multiplier+' Seconds.\u001b[0m');
		start(); // Start the script for the first time
		setInterval(() => { // Set a repeating function that is called every 1000 miliseconds times the number of seconds the user picked
			fLog("Init-Repeat > Restarting!")
			start();
		}, settings.repeatScript.slice(0, -1)*multiplier*1000); // Re above
		setInterval(() => { // Set a repeating function that is called every 60 seconds to notify the user how long until a script run
			console.log(countDown+' Minutes until script restarts...');
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
	fLog("Init > Starting Main Functions")
	checkAuth().then(constructCookie).then(checkSubscriptions).then(parseKey).then(saveSettings).then(logEpisodeCount).then(getVideos)
}

function printLines() { // Printout spacing for download bars based on the number of videos downloading
	return new Promise((resolve, reject) => {
		setTimeout(function(){
			console.log('\n'.repeat(loadCount/2))
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
		fLog("Init-Login > Logging in as "+settings.user+" via "+authUrl)
		console.log("> Logging in as", settings.user)
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
			if (body.user) { // If the server returns a user then we have logged in
				fLog("Init-Login > Logged In as "+settings.user+"!")
				console.log('\u001b[32mLogged In as '+settings.user+'!\u001b[0m\n');
				settings.cookies.__cfduid = resp.headers['set-cookie'][0]
				settings.cookies['sails.sid'] = resp.headers['set-cookie'][1]
				saveSettings().then(resolve()) // Save the new session info so we dont have to login again and finish
			} else {
				fLog("Init-Login > There was a error while logging in...")
				console.log('\x1Bc');
				console.log('\u001b[31mThere was a error while logging in...\u001b[0m\n');
				checkAuth(true) // Try to regain auth incase they entered the wrong details or their session is invalid
			}
		}, reject)
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

function saveVideoLog() { // Function for saving partial data, just writes out the variable to disk
	fs.writeFile("./videos.json", JSON.stringify(videos, null, 2), 'utf8', function (err) {
		if (err) console.log(err)
	});
}


function logEpisodeCount(){ // Print out the current number of "episodes" for each subchannel
	return new Promise((resolve, reject) => {
		fLog("Post-Init > Printing episode count")
		console.log('\n\n=== \u001b[38;5;8mEpisode Count\u001b[0m ===')
		if (!settings.ignoreFolderStructure) {
			fs.readdirSync(settings.videoFolder).forEach(function(channel){
				if (channel == 'artwork') { return false }
				episodeList[channel] = (glob.sync(settings.videoFolder+"*/*"+channel+"*.mp4").length)
				if (channel.indexOf(".") == -1) { console.log(colourList[channel]+channel+'\u001b[0m:', episodeList[channel]) }
			})
		} else {
			glob.sync(settings.videoFolder+"*.mp4").forEach(function(video){
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
		fLog("Init-Subs > Checking user subscriptions ("+subUrl+")")
		settings.subscriptions = []
		floatRequest.get({ // Generate the key used to download videos
			headers: {
				Cookie: settings.cookie,
				'accept': 'application/json'
			},
			url: subUrl
		}, function (error, resp, body) {
			JSON.parse(body).forEach(function(subscription) {
				if (subscription.plan.title == 'Linus Tech Tips') {
					settings.subscriptions.push({
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
					})
				} else {
					settings.subscriptions.push({
						id: subscription.creator,
						title: subscription.plan.title,
						enabled: true,
						ignore: {}
					})
				}
			})
			fLog("Init-Subs > Updated user subscriptions")
			console.log('> Updated subscriptions!')
			saveSettings().then(resolve())
		}, reject)
	})
}

function parseKey() { // Get the key used to download videos
	return new Promise((resolve, reject) => {
		var keyUrl = 'https://www.floatplane.com/api/video/url?guid=MSjW9s3PiG&quality=1080'
		fLog("Init-Key > Fetching video download key ("+keyUrl+")")
		console.log("> Fetching video key")
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
				if (settings.autoFetchServer) {
					settings.floatplaneServer = body.slice(1, body.lastIndexOf('floatplaneclub.com')+18).replace('Edge01', 'Edge02');
				}
				settings.key = body.replace(/.*wmsAuthSign=*/, '') // Strip everything except for the key from the generated url
				fLog("Init-Key > Key Fetched")
				console.log('\u001b[36mFetched! Using Server \u001b[0m[\u001b[38;5;208m'+settings.floatplaneServer+'\u001b[0m]');
				resolve()
			}
		});
	})
}


function getVideos() {
	return new Promise((resolve, reject) => {
		fLog("Videos-Init > Starting Main Function")
		settings.subscriptions.forEach(function(subscription) {
			if (!subscription.enabled) {
				fLog("\nVideos-Init > "+subscription.title+" is disabled, skipping")
				return false
			} // If this subscription is disabled then dont download
			for(i=1; i <= Math.ceil(settings.maxVideos/20); i++){
				var vUrl = 'https://www.floatplane.com/api/creator/videos?creatorGUID='+subscription.id+'&fetchAfter='+((i*20)-20)
				fLog("Videos-Init > Fetching "+vUrl)
				floatRequest.get({ // Generate the key used to download videos
					headers: {
						Cookie: settings.cookie,
					},
					url: vUrl
				}, function (error, resp, body) {
					fLog("Videos-Init > Fetched "+vUrl)
					if (body == '[]') {
						fLog("Videos > No Video's Returned! Please open Floatplane.com in a browser and login...")
						console.log('\n\u001b[31mNo Videos Returned! Please open Floatplane.com in a browser and login...\u001b[0m')
					} else {
						var page = resp.request.uri.query.slice(resp.request.uri.query.indexOf('&fetchAfter=')+12, resp.request.uri.query.length)/20
						if(settings.maxVideos > 20) { // If the maxPages is more than 1 then log the === LinusTechTips === as === LinusTechTips - Page x ===
							console.log('\n\n=== \u001b[38;5;8m'+subscription.title+'\u001b[0m - \u001b[95mPage '+page+'\u001b[0m ===')
						} else { // Otherwise just log it normally
							console.log('\n\n=== \u001b[38;5;8m'+subscription.title+'\u001b[0m ===')
						}
						JSON.parse(body).slice(0, settings.maxVideos+page*20).reverse().forEach(function(video, i) {
							// Set defaults for video
							matchTitle = video.title
							video.subChannel = subscription.title
							video.releaseDate = " - " + new Date(video.releaseDate).toISOString().substring(0,10) // Make it nice

							// Identify what subChannel the video belongs to if any
							if (subChannelIdentifiers[subscription.title]) {
								subChannelIdentifiers[subscription.title].forEach(function(subChannel){ // For each subChannel in a channel
									if(video[subChannel.type].toLowerCase().indexOf(subChannel.check) > -1) { // Check if this video is part of a subchannel
										fLog('Videos-Subs > Matched "'+video.title+'" to subChannel "'+subChannel.title+'"')
										video.subChannel = subChannel.title
									}
								});
							}
							if (subscription.ignore[video.subChannel]) {
								fLog('Videos-Subs > Subscription "'+video.subChannel+'" is set to ignore, skipping video "'+video.title+'"')
								return false
							} // If this video is part of a subChannel we are ignoring then break

							// Manage paths for downloads
							rawPath = settings.videoFolder+video.subChannel+'/' // Create the rawPath variable that stores the path to the file
							if (settings.ignoreFolderStructure) { rawPath = settings.videoFolder } // If we are ignoring folder structure then set the rawPath to just be the video folder
							if (!fs.existsSync(settings.videoFolder)) { // If the root video folder dosnt exist create it
								fLog('Videos-FileSystem > "'+settings.videoFolder+'"'+" doesn't exit... Creating")
								fs.mkdirSync(settings.videoFolder)
							}
							if (!fs.existsSync(rawPath)){ // Check if the first path exists (minus season folder)
								fLog('Videos-FileSystem > "'+rawPath+'"'+" doesn't exit... Creating")
								fs.mkdirSync(rawPath); // If not create the folder needed
							}

							// Manage paths for date based naming
							var seasonNumber = '01' // Set the season number to use if nothing special is being done to seasons
							if(settings.monthsAsSeasons) { // If your formatting the videos with the YEAR+MONTH as the season then
								var date = new Date(video.releaseDate) // Generate a new date from the publish date pulled above
								if(date.getMonth() < 10) { // If the month is less than 10 add a 0 to it
									var seasonNumber = date.getFullYear()+'0'+date.getMonth() // Set the seasonNumber to be the YEAR+MONTH, eg 201801
									rawPath = rawPath + seasonNumber+'/' // Set the raw path to include the new season folder
								} else {
									var seasonNumber = date.getFullYear()+date.getMonth()
									rawPath = rawPath + seasonNumber+'/'
								}
							} else if(settings.yearsAsSeasons) { // If your formatting the videos with the YEAR as the season then
								var date = new Date(video.releaseDate)
								var seasonNumber = date.getFullYear() // Set the seasonNumber to be the YEAR, eg 2018
								rawPath = rawPath + date.getFullYear()+'/'
							}
							if (!fs.existsSync(rawPath)){ // Check if the new path exists (plus season folder if enabled)
								fLog('Videos-FileSystem > "'+rawPath+'"'+" doesn't exit... Creating'")
								fs.mkdirSync(rawPath); // If not create the folder needed
							}
							if (settings.formatWithEpisodes == false && settings.formatWithDate == false) { video.title = video.subChannel+' - '+video.title }
							if (!episodeList[video.subChannel]) { episodeList[video.subChannel] = 0 }
							if (settings.formatWithEpisodes == true) { video.title = video.subChannel + ' - S'+seasonNumber+'E'+(episodeList[video.subChannel])+' - '+video.title } // add Episode Number
							if (settings.formatWithDate == true) { video.title = video.subChannel+video.releaseDate+' - '+video.title } // Add the upload date to the filename

							//console.log(colourList[video.subChannel]+video.subChannel+'\u001b[0m>', video.title);
							//console.log(video.title, video.guid, video.description, video.thumbnail.path)

							// Check if video already exists
							matchTitle = sanitize(matchTitle)
							video.title = sanitize(video.title);
							//files = glob.sync(rawPath+'*'+matchTitle.replace('(', '*').replace(')', '*')+".mp4") // Check if the video already exists based on the above match
							//partialFiles = glob.sync(rawPath+'*'+video.title.replace('(', '*').replace(')', '*')+".mp4.part") // Check if the video is partially downloaded
							if (!colourList[video.subChannel]) { colourList[video.subChannel] = '\u001b[38;5;153m' }
							if (i == Math.ceil(settings.maxVideos/20)) {
								printLines()
							}
							//if (files.length > 0) { // If it already exists then format the title nicely, log that it exists in console and end for this video
							if (videos[video.guid] == undefined){
								fLog('Download-Init > "'+video.title+'" is new, creating meta in videos.json')
								videos[video.guid] = {subChannel: video.subChannel, partial: false, saved: false}
							}
							if (!videos[video.guid].saved) {
								updatePlex = true
								episodeList[video.subChannel] += 1 // Increment the episode number for this subChannel
								try{if(partial_data[video.guid].failed){}}catch(err){partial_data[video.guid] = {failed: true}} // Check if partialdata is corrupted and use a dirty fix if it is
								if (!videos[video.guid].partial){ // If it dosnt exist then format the title with the proper incremented episode number and log that its downloading in console
									if(settings.downloadArtwork && video.thumbnail) {
										fLog('Download-Init > Downloading "'+video.title+'" artwork')
										floatRequest(video.thumbnail.path).pipe(fs.createWriteStream(rawPath+video.title+'.png'))
									} // Save the thumbnail with the same name as the video so plex will use it
									loadCount += 1
									if (liveCount < settings.maxParallelDownloads || settings.maxParallelDownloads == -1) { // If we havent hit the maxParallelDownloads or there isnt a limit then download
										process.stdout.write(colourList[video.subChannel]+'>-- '+'\u001b[0m'+matchTitle+' == \u001b[34mDOWNLOADING\u001b[0m');
										download(settings.floatplaneServer+'/Videos/'+video.guid+'/'+settings.video_res+'.mp4?wmsAuthSign='+settings.key, video.title, video.subChannel, rawPath, video) // Download the video
									} else { // Otherwise add to queue
										console.log(colourList[video.subChannel]+'>-- '+'\u001b[0m'+matchTitle+' == \u001b[35mQUEUED\u001b[0m');
										queueDownload(settings.floatplaneServer+'/Videos/'+video.guid+'/'+settings.video_res+'.mp4?wmsAuthSign='+settings.key, video.title, video.subChannel, rawPath, video) // Queue
									}
								} else { // The video is partially downloaded
									fLog('Resume-Init > "'+video.title+'" is partially downloaded... Resuming')
									if(settings.downloadArtwork && video.thumbnail) {
										fLog('Download-Init > Downloading "'+video.title+'" artwork')
										floatRequest(video.thumbnail.path).pipe(fs.createWriteStream(rawPath+partial_data[video.guid].title+'.png'))
									} // Save the thumbnail with the same name as the video so plex will use it
									loadCount += 1
									if (partial_data[video.guid].failed) { // If the download failed then start from download normally
										fLog('Resume-Init > "'+video.title+'" partial data is corrupt, restarting as a fresh download')
										//partialFiles.length = 1;
										loadCount -= 1
									} else {
										if (liveCount < settings.maxParallelDownloads || settings.maxParallelDownloads == -1) { // If we havent hit the maxParallelDownloads or there isnt a limit then download
											process.stdout.write(colourList[video.subChannel]+'>-- '+'\u001b[0m'+matchTitle+' == \u001b[38;5;226mRESUMING DOWNLOAD\u001b[0m');
											resumeDownload(settings.floatplaneServer+'/Videos/'+video.guid+'/'+settings.video_res+'.mp4?wmsAuthSign='+settings.key, partial_data[video.guid].title, video.subChannel, rawPath, video) // Download the video
										} else { // Otherwise add to queue
											console.log(colourList[video.subChannel]+'>-- '+'\u001b[0m'+matchTitle+' == \u001b[35mRESUME QUEUED\u001b[0m');
											queueResumeDownload(settings.floatplaneServer+'/Videos/'+video.guid+'/'+settings.video_res+'.mp4?wmsAuthSign='+settings.key, partial_data[video.guid].title, video.subChannel, rawPath, video) // Queue
										}
									}
								}
							} else {
								fLog('Videos > Video "'+video.title+'"'+" exist's skipping")
								console.log(colourList[video.subChannel]+video.subChannel+'\u001b[0m> '+matchTitle, '== \u001b[32mEXISTS\u001b[0m');
							}
						})
					}
				})
			}
		})
	})
}

function queueDownload(url, title, thisChannel, rawPath, video) { // Loop until current downloads is less than maxParallelDownloads and then download
	setTimeout(function(){
		if (liveCount < settings.maxParallelDownloads) {
			download(url, title, thisChannel, rawPath, video)
		} else {
			queueDownload(url, title, thisChannel, rawPath, video) // Run this function again continuing the loop
		}
	}, 500)
}

function queueResumeDownload(url, title, thisChannel, rawPath, video) { // Loop until current downloads is less than maxParallelDownloads and then download
	setTimeout(function(){
		if (liveCount < settings.maxParallelDownloads) {
			resumeDownload(url, title, thisChannel, rawPath, video)
		} else {
			queueResumeDownload(url, title, thisChannel, rawPath, video) // Run this function again continuing the loop
		}
	}, 500)
}

function download(url, title, thisChannel, rawPath, video) { // The main download function, this is the guts of downloading stuff after the url is gotten from the form
	fLog('Download > Downloading "'+video.title+'"')
	videos[video.guid].partial = true
	saveVideoLog()
	partial_data[video.guid] = {failed: true, title: title} // Set the download failed to true and the title incase a download starts but crashes before the first partial write
	var bar = multi.newBar(':title [:bar] :percent :stats', { // Format with ffmpeg for titles/plex support
		complete: '\u001b[42m \u001b[0m',
		incomplete: '\u001b[41m \u001b[0m',
		width: 30,
		total: 100
	})
	var total = 0 // Define the total size as 0 becuase nothing has downlaoded yet
	var displayTitle = pad(colourList[thisChannel]+thisChannel+'\u001b[0m'+title.replace(/.*- /,'> ').slice(0,25), 29) // Set the title for being displayed and limit it to 25 characters
	liveCount += 1 // Register that a video is beginning to download for maxParrallelDownloads
	progress(floatRequest(url), {throttle: settings.downloadUpdateTime}).on('progress', function (state) { // Send the request to download the file, run the below code every downloadUpdateTime while downloading
		partial_data[video.guid] = {failed: false, total: state.size.total, transferred: state.size.transferred, title: title} // Write out the details of the partial download
		saveData() // Save the above data
		if (state.speed == null) {state.speed = 0} // If the speed is null set it to 0
		bar.update(state.percent) // Update the bar's percentage
		// Tick the bar to update its stats including speed, transferred and eta
		bar.tick({'title': displayTitle, 'stats': ((state.speed/100000)/8).toFixed(2)+'MB/s'+' '+(state.size.transferred/1024000).toFixed(0)+'/'+(state.size.total/1024000).toFixed(0)+'MB'+' '+'ETA: '+Math.floor(state.time.remaining/60) + 'm '+Math.floor(state.time.remaining)%60 + 's'})
		total = (state.size.total/1024000).toFixed(0) // Update Total for when the download finishes
	}).on('error', function(err, stdout, stderr) {
		fLog('Download > An error occoured for "'+video.title+'": '+err)
		console.log('An error occurred: ' + err.message, err, stderr); // If there was a error with the download log it
	}).on('end', function () { // When the download finishes
		fLog('Download > Finished downloading: "'+video.title+'"')
		bar.update(1) // Set the download % to 100%
		bar.tick({'title': displayTitle, 'stats': total+'/'+total+'MB'}) // Set the stats to be totalMB/totalMB
		bar.terminate()
		loadCount -= 1 // Reduce loadCount and liveCount by 1
		liveCount -= 1
	}).pipe(fs.createWriteStream(rawPath+title+'.mp4.part')).on('finish', function(){ // Save the downloaded video using the title generated
		fs.rename(rawPath+title+'.mp4.part', rawPath+title+'.mp4', function(){}); // Rename the .part file to a .mp4 file
		file = rawPath+title+'.mp4' // Specifies where the video is saved
		name = title.replace(/^.*[0-9].- /, '').replace('- ', '') // Generate the name used for the title in metadata (This is for plex so "episodes" have actual names over Episode1...)
		file2 = (rawPath+'TEMP_'+title+'.mp4') // Specify the temp file to write the metadata to
		ffmpegFormat(file, name, file2, video) // Format with ffmpeg for titles/plex support
	});
}

function resumeDownload(url, title, thisChannel, rawPath, video) { // This handles resuming downloads, its very similar to the download function with some changes
	fLog('Resume > Resuming download for "'+video.title+'"')
	var total = partial_data[video.guid].total // Set the total size to be equal to the stored value in the partial_data
	var subTotal = partial_data[video.guid].transferred // Set subTotal as the previous ammount transferred
	var bar = multi.newBar(':title [:bar] :percent :stats', { // Create a new loading bar
		complete: '\u001b[42m \u001b[0m',
			incomplete: '\u001b[41m \u001b[0m',
		width: 30,
		total: 100
	})
	var displayTitle = pad(colourList[thisChannel]+thisChannel+'\u001b[0m'+title.replace(/.*- /,'> ').slice(0,35), 36) // Set the title for being displayed and limit it to 25 characters
	progress(floatRequest({ // Request to download the video
		url: url,
		headers: { // Specify the range of bytes we want to download as from the previous ammount transferred to the total, meaning we skip what is already downlaoded
			Range: "bytes="+partial_data[video.guid].transferred+"-"+partial_data[video.guid].total
		}
	}), {throttle: settings.downloadUpdateTime}).on('progress', function (state) { // Run the below code every downloadUpdateTime while downloading
		partial_data[video.guid].transferred = state.size.transferred+subTotal // Set the amount transferred to be equal to the preious ammount plus the new ammount transferred (Since this is a "new" download from the origonal transferred starts at 0 again)
		saveData() // Save this data
		if (state.speed == null) {state.speed = 0} // If the speed is null set it to 0
		bar.update((subTotal+state.size.transferred)/partial_data[video.guid].total) // Update the bar's percentage with a manually generated one as we cant use progresses one due to this being a partial download
		// Tick the bar same as above but the transferred value needs to take into account the previous amount.
		bar.tick({'title': displayTitle, 'stats': ((state.speed/100000)/8).toFixed(2)+'MB/s'+' '+((subTotal+state.size.transferred)/1024000).toFixed(0)+'/'+(total/1024000).toFixed(0)+'MB'+' '+'ETA: '+Math.floor(state.time.remaining/60) + 'm '+Math.floor(state.time.remaining)%60 + 's'})
	}).on('error', function(err, stdout, stderr) { // On a error log it
		fLog("Resume > An error occoured for "+video.title+": "+err)
		console.log('An error occurred: ' + err.message, err, stderr);
	}).on('end', function () { // When done downloading
		bar.update(1) // Set the progress bar to 100%
		// Tick the progress bar to display the totalMB/totalMB
		bar.tick({'title': displayTitle, 'stats': (total/1024000).toFixed(0)+'/'+(total/1024000).toFixed(0)+'MB'})
		bar.terminate()
		loadCount -= 1 // Reduce loadCount and liveCount by 1
		liveCount -= 1
	// Write out the file to the partial file previously saved. But write with read+ and set the starting byte number (Where to start wiriting to the file from) to the previous amount transferred
}).pipe(fs.createWriteStream(rawPath+title+'.mp4.part', {start: partial_data[video.guid].transferred, flags: 'r+'})).on('finish', function(){ // When done writing out the file
		fs.rename(rawPath+title+'.mp4.part', rawPath+title+'.mp4', function(){}); // Rename it without .part
		file = rawPath+title+'.mp4' // Specifies where the video is saved
		name = title.replace(/^.*[0-9].- /, '').replace('- ', '') // Generate the name used for the title in metadata (This is for plex so "episodes" have actual names over Episode1...)
		file2 = (rawPath+'TEMP_'+title+'.mp4') // Specify the temp file to write the metadata to
		ffmpegFormat(file, name, file2, video) // Format with ffmpeg for titles/plex support
	});
}

function ffmpegFormat(file, name, file2, video) { // This function adds titles to videos using ffmpeg for compatibility with plex
	if (settings.ffmpeg) {
		fLog('ffmpeg > Beginning ffmpeg title formatting for "'+video.title+'"')
		ffmpeg(file).outputOptions("-metadata", "title="+name, "-map", "0", "-codec", "copy").saveToFile(file2).on('error', function(err, stdout, stderr) { // Add title metadata
			setTimeout(function(){ // If the formatting fails, wait a second and try again
				//console.log(name+' \u001b[41mFFMPEG Encountered a Error!\u001b[0m')
				fLog('ffmpeg > An error occoured for "'+video.title+'": '+err+" Retrying...")
				if(err){ffmpegFormat(file, name, file2, video)}
			}, 1000)
		}).on('end', function() { // Save the title in metadata
			if(loadCount == -1) { // If we are at the last video then run a plex collection update
				updateLibrary();
			}
			fs.rename(file2, file, function(){
				fLog('ffmpeg > Renamed "'+file2+"' to '"+file+'"')
			})
		})
	}
	fLog('Download > Updated VideoStore for video "'+video.title+'"')
	delete partial_data[video.guid] // Remove its partial data
	videos[video.guid].file = file // Note the file that the video is saved to
	videos[video.guid].saved = true // Set it to be saved
	saveVideoLog();
}

function updateLibrary() { // Function for updating plex libraries
	return new Promise((resolve, reject) => {
		if(settings.localPlex) { // Run if local plex is enabled
			fLog("PlexUpdate > Updating Plex Section")
			spawn(settings.plexScannerInstall,	['--scan', '--refresh', '--force', '--section', settings.plexSection]); // Run the plex update command
		}
		if (settings.remotePlex) { // Run if remote plex is enabled
			fLog("PlexUpdate > Updating Plex Section")
			request({ // Sends a request to update the remote library using the servers ip, port, section and plexToken
				url: 'http://'+settings.remotePlexIP+':'+settings.remotePlexPort+'/library/sections/'+settings.plexSection+'/refresh?X-Plex-Token='+settings.plexToken,
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

function saveData() { // Function for saving partial data, just writes out the variable to disk
	fs.writeFile("./partial.json", JSON.stringify(partial_data), 'utf8', function (err) {
		if (err) console.log(err)
	});
}
