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

process.on('uncaughtException', function(err) { // "Nice" Error handling, will obscure unknown errors, remove or comment for full debugging
	if (err == "TypeError: Cannot read property '0' of undefined") { // If this error
		console.log('\u001b[41mERROR> Using old session data is failing! Please set forceLogin to true in settings.json\u001b[0m') // Then print out what the user should do
	} if (err == "ReferenceError: thisChannel is not defined") {
		console.log('\u001b[41mERROR> Error with "maxVideos"! Please set "maxVideos" to something other than '+settings.maxVideos+' in settings.json\u001b[0m')
	} if(err.toString().indexOf('Unexpected end of JSON input') > -1 && err.toString().indexOf('partial.json') > -1) { // If this error and the error is related to this file
	console.log('\u001b[41mERROR> Corrupt partial.json file! Attempting to recover...\u001b[0m');
	fs.writeFile("./partial.json", '{}', 'utf8', function (error) { // Just write over the corrupted file with {}
		if (error) {
			console.log('\u001b[41mRecovery failed! Error: '+error+'\u001b[0m')
			process.exit()
		} else {
			console.log('\u001b[42mRecovered! Please restart script...\u001b[0m');
			process.exit()
		}
	});
	} else {
		//console.log(err)
		throw err
	}
});

const settings = require('./settings.json'); // File containing user settings
const partial_data = require('./partial.json'); // File for saving details of partial downloads

const subChannelIdentifiers = {
	"Linus Tech Tips": [
		{
			title: 'Channel Super Fun',
			check: 'https://twitter.com/channelsuperfun',
			type: 'description',
			colour: '\u001b[38;5;220m'
		},
		{
			title: 'Floatplane Exclusive',
			check: 'Exclusive',
			type: 'title',
			colour: '\u001b[38;5;200m'
		},
		{
			title: 'TechLinked',
			check: 'http://twitter.com/TechLinkedYT',
			type: 'description',
			colour: '\u001b[38;5;14m'
		},
		{
			title: 'TechQuickie',
			check: 'http://twitter.com/jmart604',
			type: 'description',
			colour: '\u001b[38;5;153m'
		},
	]
}

var floatRequest = request.defaults({ // Sets the global requestMethod to be used, this maintains headers
    headers: {'User-Agent': "FloatplanePlex/"+settings.version+" (Inrix, +https://linustechtips.com/main/topic/859522-floatplane-download-plex-script-with-code-guide/)"},
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
var seasonNumber = '01' // Set the season number to use if nothing special is being done to seasons

files = glob.sync("./node_modules/ffmpeg-binaries/bin/ffmpeg.exe") // Check if the video already exists based on the above match
if (files.length == -1) {
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
		console.log('\u001b[33mNew Version Avalible: v'+updateInfo.version+' | Update with update.bat!\u001b[0m')
	} else if(updateInfo.version < settings.version) { // If the script is a beta version/nonpublic
		console.log('\u001b[35mOhh, your running a hidden beta! Spooky...\u001b[0m')
	}
})

// Earlybird functions, these are run before script start for things such as auto repeat and getting plex info
getPlexToken().then(getPlexDetails).then(remotePlexCheck).then(repeatScript)

function getPlexToken() { // If remoteplex is enabled then this asks the user for the plex username and password to generate a plexToken for remote refreshes
	return new Promise((resolve, reject) => {
		if (settings.remotePlex && settings.plexToken == "") {
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
					console.log('\u001b[36mFetched!\u001b[0m\n');
					settings.plexToken = JSON.parse(body).user.authToken
					resolve()
				})
			});
		} else if (settings.remotePlex && settings.plexToken != "") {
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
		console.log('\u001b[41mRepeating for '+settings.repeatScript+' or '+settings.repeatScript.slice(0, -1)*multiplier+' Seconds.\u001b[0m');
		start(); // Start the script for the first time
		setInterval(() => { // Set a repeating function that is called every 1000 miliseconds times the number of seconds the user picked
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
	checkAuth().then(constructCookie).then(saveSettings).then(checkSubscriptions).then(getVideos)
	//.then(parseKey).then(logEpisodeCount).then(findVideos).then(printLines)
}

function printLines() { // Printout spacing for download bars based on the number of videos downloading
	return new Promise((resolve, reject) => {
		setTimeout(function(){
			console.log('\n'.repeat(loadCount+1))
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
			console.log('> Using saved login data');
			resolve()
		}
	})
}

function doLogin() { // Login using the users credentials and save the cookies & session
	console.log("> Logging in as", settings.user)
	return new Promise((resolve, reject) => {
		floatRequest.post({
			method: 'POST',
			json: {username: settings.user, password: settings.password},
			url: 'https://www.floatplane.com/api/user/login',
		}, function (error, resp, body) {
			if (resp.headers['set-cookie']) { // If the server returns cookies then we have probably logged in
				console.log('\u001b[32mLogged In!\u001b[0m\n');
				settings.cookies.__cfduid = resp.headers['set-cookie'][0]
				settings.cookies['sails.sid'] = resp.headers['set-cookie'][1]
				saveSettings().then(resolve()) // Save the new session info so we dont have to login again and finish
			} else {
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

function logEpisodeCount(){ // Print out the current number of "episodes" for each subchannel
	console.log('=== \u001b[95mEpisode Count\u001b[0m ===')
	channels.forEach(function(channel){
		console.log('\n>--'+channel.name)
		channel.subChannels.forEach(function(subChannel){
			if (!settings.ignoreFolderStructure) { // Depending on if we are ignoring folder structure we need to scan for videos differently
				subChannel.episode_number = (glob.sync(settings.videoFolder+"*/*"+subChannel.formatted+"*.mp4*").length + 1)
				console.log(subChannel.formatted+':', subChannel.episode_number-1)
			} else {
				subChannel.episode_number = (glob.sync(settings.videoFolder+subChannel.formatted+"*.mp4*").length + 1)
				console.log(subChannel.formatted+':', subChannel.episode_number-1)
			}
		});
	});
}

function checkSubscriptions() {
	return new Promise((resolve, reject) => {
		if (settings.subscriptions.length == 0) {
			floatRequest.get({ // Generate the key used to download videos
				headers: {
					Cookie: settings.cookie,
				},
				url: 'https://www.floatplane.com/api/user/subscriptions'
			}, function (error, resp, body) {
				JSON.parse(body).forEach(function(subscription) {
					settings.subscriptions.push({
						id: subscription.plan.owner,
						title: subscription.plan.title,
						enabled: true
					})
				})
				console.log('> Updated subscriptions!')
				saveSettings().then(resolve())
			}, reject)
		} else {
			console.log('> Using saved subscriptions')
			resolve()
		}
	})
}

function getVideos() {
	return new Promise((resolve, reject) => {
		settings.subscriptions.forEach(function(subscription) {
			for(i=1; i <= Math.ceil(settings.maxVideos/20); i++){
				floatRequest.get({ // Generate the key used to download videos
					headers: {
						Cookie: settings.cookie,
					},
					url: 'https://www.floatplane.com/api/creator/videos?creatorGUID='+subscription.id+'&fetchAfter='+((i*20)-20)
				}, function (error, resp, body) {
					var page = resp.request.uri.query.slice(resp.request.uri.query.indexOf('&fetchAfter=')+12, resp.request.uri.query.length)/20
					if(settings.maxVideos > 20) { // If the maxPages is more than 1 then log the === LinusTechTips === as === LinusTechTips - Page x ===
						console.log('\n===\u001b[38;5;39m'+subscription.title+'\u001b[0m - \u001b[95mPage '+page+'\u001b[0m===')
					} else { // Otherwise just log it normally
						console.log('\n===\u001b[38;5;39m'+subscription.title+'\u001b[0m===')
					}
					JSON.parse(body).forEach(function(video, i) {
						if (i+(page*20) >= settings.maxVideos) { // Break on max videos parsed
							return false
						}
						video.subChannel = subscription.title
						video.colour = '\u001b[38;5;208m'
						video.releaseDate = " - " + new Date(video.releaseDate).toISOString().substring(0,10) // Make it nice
						subChannelIdentifiers[subscription.title].forEach(function(subChannel){ // For each subChannel in a channel
							if(video[subChannel.type].indexOf(subChannel.check) > -1) { // Check if this video is part of a subchannel
								video.subChannel = subChannel.title
								video.colour = subChannel.colour
							}
						});
						rawPath = settings.videoFolder+video.subChannel+'/' // Create the rawPath variable that stores the path to the file
						if (settings.ignoreFolderStructure) { rawPath = settings.videoFolder } // If we are ignoring folder structure then set the rawPath to just be the video folder
						if (!fs.existsSync(settings.videoFolder)) { // If the root video folder dosnt exist create it
							fs.mkdirSync(settings.videoFolder)
						}
						if (!fs.existsSync(rawPath)){ // Check if the first path exists (minus season folder)
							fs.mkdirSync(rawPath); // If not create the folder needed
						}
						//console.log(video.colour+video.subChannel+'\u001b[0m>', video.title);
						//console.log(video.title, video.guid, video.description, video.thumbnail.path)
					})
				})
			}
		})
	})
}


function findVideos() {
	channels.forEach(function(channel){ // Find videos for each channel
		for(i=settings.maxPages; i >= 1; i--){ // For each page run this
			floatRequest.get({
				url: channel.url+'/?page='+i, // Request is different for each page
				headers: {
					Cookie: settings.cookie
				}
			}, function(err, resp, body) {
				if(settings.maxPages > 1) { // If the maxPages is more than 1 then log the === LinusTechTips === as === LinusTechTips - Page x ===
					console.log('\n===\u001b[96m'+channel.name+'\u001b[0m - \u001b[95mPage '+resp.request.uri.query.slice(-1)+'\u001b[0m===')
				} else { // Otherwise just log it normally
					console.log('\n===\u001b[96m'+channel.name+'\u001b[0m===')
				}
				const $ = cheerio.load(body, { xmlMode: true }); // Load the XML of the form for the channel we are currently searching
				var postArray = $('item').toArray().slice(0, settings.maxVideos).reverse()
				postArray.forEach(function(element, i) { // For every "form post" on this page run the code below
					if (i >= settings.maxVideos) { // Break on max videos parsed
						return false
					}
					thisTitle = $(element).find('title').text() // Set the video title based off the post title
					dateTime = $(element).find('pubDate').text() // Set the video date based off the publish date
					dateTime = " - " + new Date(dateTime).toISOString().substring(0,10) // Make it nice
					$2 = cheerio.load($(element).find('description').text()) // Load the html for the embedded video to parse the video id
					$2('iframe').each(function(iC, elem) { // For each of the embedded videos
						vidID = String($2(this).attr('src')).replace('https://cms.linustechtips.com/get/player/', '') // Get the id of the video
						if (vidID.indexOf('http') > -1) { // Check for embedded content that isnt a video
							return false
						} else {
							iN = i + iC // Create a counter that does all videos
							video_count = $2('iframe').length
							if (video_count > 1){ // If there is more than one video on a post, just add a number to the title
								title = thisTitle+' #'+(iC+1)
							} else {
								title = thisTitle
							}
							match = title.replace(/:/g, ' -') // Clean up the title for matching against existing videos to determine if they are already downloaded
							// Determine what channel it is from
							channel.subChannels.forEach(function(subChannel){ // For each subChannel in a channel
								if(match.indexOf(subChannel.raw) > -1) { // Check if this video is part of a subchannel
									thisChannel = subChannel
								}
							});
							rawPath = settings.videoFolder+thisChannel.formatted+'/' // Create the rawPath variable that stores the path to the file
							if (settings.ignoreFolderStructure) { rawPath = settings.videoFolder } // If we are ignoring folder structure then set the rawPath to just be the video folder
							if (!fs.existsSync(settings.videoFolder)) { // If the root video folder dosnt exist create it
								fs.mkdirSync(settings.videoFolder)
							}
							if (!fs.existsSync(rawPath)){ // Check if the first path exists (minus season folder)
								fs.mkdirSync(rawPath); // If not create the folder needed
							}
							var seasonNumber = '01' // Set the season number to use if nothing special is being done to seasons
							if(settings.monthsAsSeasons) { // If your formatting the videos with the YEAR+MONTH as the season then
								var date = new Date(dateTime) // Generate a new date from the publish date pulled above
								if(date.getMonth() < 10) { // If the month is less than 10 add a 0 to it
									var seasonNumber = date.getFullYear()+'0'+date.getMonth() // Set the seasonNumber to be the YEAR+MONTH, eg 201801
									rawPath = rawPath + seasonNumber+'/' // Set the raw path to include the new season folder
								} else {
									var seasonNumber = date.getFullYear()+date.getMonth()
									rawPath = rawPath + seasonNumber+'/'
								}
							} else if(settings.yearsAsSeasons) { // If your formatting the videos with the YEAR as the season then
								var date = new Date(dateTime)
								var seasonNumber = date.getFullYear() // Set the seasonNumber to be the YEAR, eg 2018
								rawPath = rawPath + date.getFullYear()+'/'
							}
							if (!fs.existsSync(rawPath)){ // Check if the new path exists (plus season folder if enabled)
								fs.mkdirSync(rawPath); // If not create the folder needed
							}
							if (settings.subChannelIgnore[thisChannel.formatted]) {return false} // If this video is part of a subChannel we are ignoring then break
							titlePrefix = thisChannel.formatted
							if (settings.formatWithEpisodes == true) { titlePrefix = titlePrefix + ' - S'+seasonNumber+'E'+(thisChannel.episode_number) } // add Episode Number
							if (settings.formatWithDate == true) { titlePrefix = titlePrefix + dateTime } // Add the upload date to the filename
							titlePrefix = titlePrefix + thisChannel.extra;
							match = match.replace(thisChannel.replace, '') // Format its title based on the subchannel
							match = match.replace('@CES', ' @CES') // Dirty fix for CES2018 content
							match = match.replace(/:/g, ' -').replace(/ - /g, ' ').replace(/ – /g, ' ') // Cleaning up title and fixes for plex naming being weird
							match = sanitize(match);
							match = match.replace(/^.*[0-9].- /, '').replace('.mp4','') // Prepare it for matching files
							// Added replace cases for brackets as they are being interperted as regex and windows escaping is broken for glob
							files = glob.sync(rawPath+'*'+match.replace('(', '*').replace(')', '*')+".mp4") // Check if the video already exists based on the above match
							partialFiles = glob.sync(rawPath+'*'+match.replace('(', '*').replace(')', '*')+".mp4.part") // Check if the video is partially downloaded
							if (files.length > 0) { // If it already exists then format the title nicely, log that it exists in console and end for this video
								return_title = title.replace(/:/g, ' -')
								console.log(return_title, '== \u001b[32mEXISTS\u001b[0m');
							} else {
								updatePlex = true
								if(thisChannel.name != 'BitWit Ultra') { // Fix for bitwit with the new dash renaming for plex
									title = title.replace(/:/g, ' -').replace(/ - /g, ' ').replace(/ – /g, ' ').replace(thisChannel.replace, titlePrefix+' -') // Cleaning up title and fixes for plex naming being weird
								} else {
									title = title.replace(/:/g, ' -').replace(/ - /g, ' ').replace(/ – /g, ' ').replace(thisChannel.replace, titlePrefix+' - ') // Cleaning up title and fixes for plex naming being weird
								}
								thisChannel.episode_number += 1 // Increment the episode number for this subChannel
								title = title.replace('@CES ', ' @CES ') // Dirty fix for CES2018 content
								title = sanitize(title);
								if(vidID.indexOf('youtube') > -1) { // If its a youtube video then download via youtube
									console.log('>--', title, '== \u001b[36mDOWNLOADING [Youtube 720p]\u001b[0m');
									downloadYoutube(vidID, title, thisChannel, rawPath)
									if(settings.downloadArtwork) {request('https://img.youtube.com/vi/'+ytdl.getVideoID(vidID)+'/hqdefault.jpg').on('error', function (err) { // If we are downloading artwork then download artwork
										if (err) console.log(err);
									}).pipe(fs.createWriteStream(rawPath+title+'.jpg'));}
								} else {
									try{if(partial_data[match].failed){}}catch(err){partial_data[match] = {failed: true}} // Check if partialdata is corrupted and use a dirty fix if it is
									if(partialFiles.length > 0) { // If the video is partially downloaded
										if(settings.downloadArtwork) { floatRequest('https://cms.linustechtips.com/get/thumbnails/by_guid/'+vidID).pipe(fs.createWriteStream(rawPath+partial_data[match].title+'.png'))} // Save the thumbnail with the same name as the video so plex will use it
										loadCount += 1
										if (partial_data[match].failed) { // If the download failed then start from download normally
											partialFiles.length = 1;
											loadCount -= 1
										} else {
											if (liveCount < settings.maxParallelDownloads || settings.maxParallelDownloads == -1) { // If we havent hit the maxParallelDownloads or there isnt a limit then download
												process.stdout.write('>-- '+title+' == \u001b[33mRESUMING DOWNLOAD\u001b[0m');
												resumeDownload(settings.floatplaneServer+'/Videos/'+vidID+'/'+settings.video_res+'.mp4?wmsAuthSign='+settings.key, partial_data[match].title, thisChannel, match, rawPath) // Download the video
											} else { // Otherwise add to queue
												console.log('>-- '+title+' == \u001b[35mRESUME QUEUED\u001b[0m');
												queueResumeDownload(settings.floatplaneServer+'/Videos/'+vidID+'/'+settings.video_res+'.mp4?wmsAuthSign='+settings.key, partial_data[match].title, thisChannel, match, rawPath) // Queue
											}
										}
									}
									if (partialFiles.length <= 0){ // If it dosnt exist then format the title with the proper incremented episode number and log that its downloading in console
										if(settings.downloadArtwork) { floatRequest('https://cms.linustechtips.com/get/thumbnails/by_guid/'+vidID).pipe(fs.createWriteStream(rawPath+title+'.png'))} // Save the thumbnail with the same name as the video so plex will use it
										loadCount += 1
										if (liveCount < settings.maxParallelDownloads || settings.maxParallelDownloads == -1) { // If we havent hit the maxParallelDownloads or there isnt a limit then download
											process.stdout.write('>-- '+title+' == \u001b[1m\u001b[34mDOWNLOADING\u001b[0m');
											download(settings.floatplaneServer+'/Videos/'+vidID+'/'+settings.video_res+'.mp4?wmsAuthSign='+settings.key, title, thisChannel, match, rawPath) // Download the video
										} else { // Otherwise add to queue
											console.log('>-- '+title+' == \u001b[35mQUEUED\u001b[0m');
											queueDownload(settings.floatplaneServer+'/Videos/'+vidID+'/'+settings.video_res+'.mp4?wmsAuthSign='+settings.key, title, thisChannel, match, rawPath) // Queue
										}
									}
								}
							}
						}
					})
				})
			});
		}
	})
}

function queueDownload(url, title, thisChannel, match, rawPath) { // Loop until current downloads is less than maxParallelDownloads and then download
	setTimeout(function(){
		if (liveCount < settings.maxParallelDownloads) {
			download(url, title, thisChannel, match, rawPath)
		} else {
			queueDownload(url, title, thisChannel, match, rawPath) // Run this function again continuing the loop
		}
	}, 500)
}

function queueResumeDownload(url, title, thisChannel, match, rawPath) { // Loop until current downloads is less than maxParallelDownloads and then download
	setTimeout(function(){
		if (liveCount < settings.maxParallelDownloads) {
			resumeDownload(url, title, thisChannel, match, rawPath)
		} else {
			queueResumeDownload(url, title, thisChannel, match, rawPath) // Run this function again continuing the loop
		}
	}, 500)
}

function downloadYoutube(url, title, thisChannel, rawPath) { // Download function for youtube videos
	ytdl(url).pipe(fs.createWriteStream(rawPath+title+'.mp4')).on('finish', function(){ // Save the downloaded video using the title generated
		file = rawPath+'/'+title+'.mp4' // Specifies where the video is saved
		name = title.replace(/^.*[0-9].- /, '').replace('- ', '') // Generate the name used for the title in metadata (This is for plex so "episodes" have actual names over Episode1...)
		file2 = (rawPath+'/'+'TEMP_'+title+'.mp4') // Specify the temp file to write the metadata to
		ffmpegFormat(file, name, file2, {url: url, title: title, thisChannel: thisChannel, match: false}) // Run formatting
	});
}

function download(url, title, thisChannel, match, rawPath) { // The main download function, this is the guts of downloading stuff after the url is gotten from the form
	partial_data[match] = {failed: true, title: title} // Set the download failed to true and the title incase a download starts but crashes before the first partial write
	var bar = multi.newBar(':title [:bar] :percent :stats', { // Format with ffmpeg for titles/plex support
		complete: '\u001b[42m \u001b[0m',
			incomplete: '\u001b[41m \u001b[0m',
		width: 30,
		total: 100
	})
	var total = 0 // Define the total size as 0 becuase nothing has downlaoded yet
	var displayTitle = pad(thisChannel.raw+title.replace(/.*- /,'>').slice(0,25), 29) // Set the title for being displayed and limit it to 25 characters
	liveCount += 1 // Register that a video is beginning to download for maxParrallelDownloads
	progress(floatRequest(url), {throttle: settings.downloadUpdateTime}).on('progress', function (state) { // Send the request to download the file, run the below code every downloadUpdateTime while downloading
		partial_data[match] = {failed: false, total: state.size.total, transferred: state.size.transferred, title: title} // Write out the details of the partial download
		saveData() // Save the above data
		if (state.speed == null) {state.speed = 0} // If the speed is null set it to 0
		bar.update(state.percent) // Update the bar's percentage
		// Tick the bar to update its stats including speed, transferred and eta
		bar.tick({'title': displayTitle, 'stats': ((state.speed/100000)/8).toFixed(2)+'MB/s'+' '+(state.size.transferred/1024000).toFixed(0)+'/'+(state.size.total/1024000).toFixed(0)+'MB'+' '+'ETA: '+Math.floor(state.time.remaining/60) + 'm '+Math.floor(state.time.remaining)%60 + 's'})
		total = (state.size.total/1024000).toFixed(0) // Update Total for when the download finishes
	}).on('error', function(err, stdout, stderr) {
		console.log('An error occurred: ' + err.message, err, stderr); // If there was a error with the download log it
	}).on('end', function () { // When the download finishes
		bar.update(1) // Set the download % to 100%
		bar.tick({'title': displayTitle, 'stats': total+'/'+total+'MB'}) // Set the stats to be totalMB/totalMB
		bar.terminate()
		loadCount -= 1 // Reduce loadCount and liveCount by 1
		liveCount -= 1
	}).pipe(fs.createWriteStream(rawPath+title+'.mp4.part')).on('finish', function(){ // Save the downloaded video using the title generated
		fs.rename(rawPath+title+'.mp4.part', rawPath+title+'.mp4', function(){}); // Rename the .part file to a .mp4 file
		delete partial_data[match] // Remove this videos partial data
		file = rawPath+title+'.mp4' // Specifies where the video is saved
		name = title.replace(/^.*[0-9].- /, '').replace('- ', '') // Generate the name used for the title in metadata (This is for plex so "episodes" have actual names over Episode1...)
		file2 = (rawPath+'TEMP_'+title+'.mp4') // Specify the temp file to write the metadata to
		ffmpegFormat(file, name, file2, {url: url, title: title, thisChannel: thisChannel, match: match}) // Format with ffmpeg for titles/plex support
	});
}

function resumeDownload(url, title, thisChannel, match, rawPath) { // This handles resuming downloads, its very similar to the download function with some changes
	var total = partial_data[match].total // Set the total size to be equal to the stored value in the partial_data
	var subTotal = partial_data[match].transferred // Set subTotal as the previous ammount transferred
	var bar = multi.newBar(':title [:bar] :percent :stats', { // Create a new loading bar
		complete: '\u001b[42m \u001b[0m',
			incomplete: '\u001b[41m \u001b[0m',
		width: 30,
		total: 100
	})
	var displayTitle = pad(thisChannel.raw+title.replace(/.*- /,'>').slice(0,35), 36) // Set the title for being displayed and limit it to 25 characters
	progress(floatRequest({ // Request to download the video
		url: url,
		headers: { // Specify the range of bytes we want to download as from the previous ammount transferred to the total, meaning we skip what is already downlaoded
			Range: "bytes="+partial_data[match].transferred+"-"+partial_data[match].total
		}
	}), {throttle: settings.downloadUpdateTime}).on('progress', function (state) { // Run the below code every downloadUpdateTime while downloading
		partial_data[match].transferred = state.size.transferred+subTotal // Set the amount transferred to be equal to the preious ammount plus the new ammount transferred (Since this is a "new" download from the origonal transferred starts at 0 again)
		saveData() // Save this data
		if (state.speed == null) {state.speed = 0} // If the speed is null set it to 0
		bar.update((subTotal+state.size.transferred)/partial_data[match].total) // Update the bar's percentage with a manually generated one as we cant use progresses one due to this being a partial download
		// Tick the bar same as above but the transferred value needs to take into account the previous amount.
		bar.tick({'title': displayTitle, 'stats': ((state.speed/100000)/8).toFixed(2)+'MB/s'+' '+((subTotal+state.size.transferred)/1024000).toFixed(0)+'/'+(total/1024000).toFixed(0)+'MB'+' '+'ETA: '+Math.floor(state.time.remaining/60) + 'm '+Math.floor(state.time.remaining)%60 + 's'})
	}).on('error', function(err, stdout, stderr) { // On a error log it
		console.log('An error occurred: ' + err.message, err, stderr);
	}).on('end', function () { // When done downloading
		bar.update(1) // Set the progress bar to 100%
		// Tick the progress bar to display the totalMB/totalMB
		bar.tick({'title': displayTitle, 'stats': (total/1024000).toFixed(0)+'/'+(total/1024000).toFixed(0)+'MB'})
		bar.terminate()
		loadCount -= 1 // Reduce loadCount and liveCount by 1
		liveCount -= 1
	// Write out the file to the partial file previously saved. But write with read+ and set the starting byte number (Where to start wiriting to the file from) to the previous amount transferred
	}).pipe(fs.createWriteStream(rawPath+title+'.mp4.part', {start: partial_data[match].transferred, flags: 'r+'})).on('finish', function(){ // When done writing out the file
		fs.rename(rawPath+title+'.mp4.part', rawPath+title+'.mp4', function(){}); // Rename it without .part
		delete partial_data[match] // Remove its partial data
		file = rawPath+title+'.mp4' // Specifies where the video is saved
		name = title.replace(/^.*[0-9].- /, '').replace('- ', '') // Generate the name used for the title in metadata (This is for plex so "episodes" have actual names over Episode1...)
		file2 = (rawPath+'TEMP_'+title+'.mp4') // Specify the temp file to write the metadata to
		ffmpegFormat(file, name, file2, {url: url, title: title, thisChannel: thisChannel, match: match}) // Format with ffmpeg for titles/plex support
	});
}

function ffmpegFormat(file, name, file2, recover) { // This function adds titles to videos using ffmpeg for compatibility with plex
	ffmpeg(file).outputOptions("-metadata", "title="+name, "-map", "0", "-codec", "copy").saveToFile(file2).on('error', function(err, stdout, stderr) { // Add title metadata
		setTimeout(function(){ // If the formatting fails, wait a second and try again
			if(err){ffmpegFormat(file, name, file2)}
		}, 1000)
	}).on('end', function() { // Save the title in metadata
		if(loadCount == -1) { // If we are at the last video then run a plex collection update
			updateLibrary();
		}
		fs.rename(file2, file, function(){})
	})
}

function updateLibrary() { // Function for updating plex libraries
	return new Promise((resolve, reject) => {
		if(settings.localPlex) { // Run if local plex is enabled
			spawn(settings.plexScannerInstall,	['--scan', '--refresh', '--force', '--section', settings.plexSection]); // Run the plex update command
		}
		if (settings.remotePlex) { // Run if remote plex is enabled
			request({ // Sends a request to update the remote library using the servers ip, port, section and plexToken
				url: 'http://'+settings.remotePlexIP+':'+settings.remotePlexPort+'/library/sections/'+settings.plexSection+'/refresh?X-Plex-Token='+settings.plexToken,
			}, function(err, resp, body){
				if (body.indexOf('404') > -1) { // If result is 404 then the section probably dosnt exist
					console.log('\u001b[41m> remotePlex ERR: Cannot refresh... Invalid library section defined in settings!\u001b[0m')
				} else {
					console.log('\u001b[33m> Refreshed plex section!\u001b[0m')
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
