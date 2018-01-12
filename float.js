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

const settings = require('./settings.json'); // File containing user settings
const partial_data = require('./partial.json'); // File for saving details of partial downloads


if(process.platform === 'win32'){ // If not using windows attempt to use linux ffmpeg
	process.env.FFMPEG_PATH = "./node_modules/ffmpeg-binaries/bin/ffmpeg.exe"
} else {
	process.env.FFMPEG_PATH = "/usr/bin/ffmpeg"
}
var progressStates = [];
var barArray = [];
var loadCount = -1;
var liveCount = 0;
var channels = []
if (settings.useFloatplane == true){ // Create the array containing the details for each Channel and its SubChannels
	channels.push({'url': 'https://linustechtips.com/main/forum/91-lmg-floatplane.xml', 'name': 'Linus Media Group', 'subChannels': [
		{'raw': 'FP', 'formatted': 'Floatplane Exclusive', 'name': 'Floatplane', 'replace': new RegExp('.*FP.*-'), 'episode_number': 0, 'extra': ' -'},
		{'raw': 'LTT', 'formatted': 'Linus Tech Tips', 'name': 'LTT', 'replace': 'LTT', 'episode_number': 0, 'extra': ''},
		{'raw': 'TQ', 'formatted': 'Techquickie', 'name': 'Techquickie', 'replace': 'TQ', 'episode_number': 0, 'extra': ''},
		{'raw': 'CSF', 'formatted': 'Channel Super Fun', 'name': 'CSF', 'replace': 'CSF', 'episode_number': 0, 'extra': ''}
	]})
}
if (settings.useBitWit == true) {
	channels.push({'url': 'https://linustechtips.com/main/forum/93-bitwit-ultra.xml', 'name': 'BitWit Ultra', 'subChannels': [
		{'raw': '', 'formatted': 'BitWit Ultra', 'name': 'BitWit Ultra', 'replace': '', 'episode_number': 0, 'extra': ' - '}
	]})
}
files = glob.sync("./node_modules/ffmpeg-binaries/bin/ffmpeg.exe") // Check if the video already exists based on the above match
if (files.length == -1) {
	console.log('You need to install ffmpeg! Type "npm install ffmpeg-binaries" in console inside the script folder...');
	process.exit()
}
// Set request defaults
req = request.defaults({
	jar: true, // Use the same cookies globally
	rejectUnauthorized: false,
});

// Finish Init, Sart Script

// Check that the user is authenticated, then construct cookies, get the video key, log the current episodes and finally check for new videos
// The below line triggers the main functions of the script
request.get({ // Check if there is a newer version avalible for download
	url: 'https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/latest.json',
}, function (err, resp, body) {
	updateInfo = JSON.parse(body)
	if(updateInfo.version > settings.version) { // If the script is outdated
		console.log('New Version Avalible: v'+updateInfo.version+' | Update with update.bat!')
	} else if(updateInfo.version < settings.version) { // If the script is a beta version/nonpublic
		console.log('Ohh, your running a hidden beta! Spooky...')
	}
})

if (settings.forceLogin) { // Check if we are forcing login or not and run stuff accordingly
	getSession().then(doLogin).then(constructCookie).then(parseKey).then(logEpisodeCount).then(findVideos).then(printLines)
} else {
	checkAuth().then(parseKey).then(logEpisodeCount).then(findVideos).then(printLines)
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
		if (forced || !settings.cookies.ips4_IPSSessionFront && (!settings.user || !settings.password)) {
			console.log('> Please enter your login details:');
			prompt.start();
			prompt.get([{name: "Email/Username", required: true}, {name: "Password", required: true, hidden: true, replace: '*'}], function (err, result) {
				settings.user = result['Email/Username']
				settings.password = result.Password
				console.log('');
				getSession().then(doLogin).then(resolve) // After getting the users details get their session and log them in. Then finish.
			});
			// If they have no session but do have login details then just get their session log them in and finish.
		} else if((!settings.cookies.ips4_IPSSessionFront && (settings.user || settings.password))) {
			getSession().then(doLogin).then(resolve)
		}	else {
			// They are already logged in with suficcent auth, just continue.
			console.log('> Using saved login data');
			resolve()
		}
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

function getSession() { // Go to the LTT homepage to get a session key
	console.log("> Fetching session")
	return new Promise((resolve, reject) => {
		req.get({ // Generate the key used to download videos
			url: 'https://linustechtips.com/',
			'content-type': 'application/x-www-form-urlencoded'
		}, function (error, resp, body) {
			settings.cookies.ips4_IPSSessionFront = resp.headers["set-cookie"][0];
			settings.csrfKey = body.split("csrfKey=")[1].split("'")[0];
			resolve();
		}, reject)
	})
}

function doLogin() { // Login using the users credentials and save the cookies & session
	console.log("> Logging in as", settings.user)
	return new Promise((resolve, reject) => {
		req.post({
			headers: {
				Cookie: settings.cookies.ips4_IPSSessionFront,
				'content-type': 'application/x-www-form-urlencoded',
			},
			url: 'https://linustechtips.com/main/login/',
			body: "login__standard_submitted=1&csrfKey=" + settings.csrfKey + "&auth=" + settings.user + "&password=" + settings.password + "&remember_me=1&remember_me_checkbox=1&signin_anonymous=0"
		}, function (error, resp, body) {
			if (resp.headers['set-cookie']) { // If the server returns cookies then we have probably logged in
				console.log('Logged In!\n');
				settings.cookies.ips4_device_key = resp.headers['set-cookie'][0]
				settings.cookies.ips4_member_id = resp.headers['set-cookie'][1]
				settings.cookies.ips4_login_key = resp.headers['set-cookie'][2]
				saveSettings().then(resolve()) // Save the new session info so we dont have to login again and finish
			} else {
				console.log('\x1Bc');
				console.log('There was a error while logging in...\n');
				checkAuth(true) // Try to regain auth incase they entered the wrong details or their session is invalid
			}
		}, reject)
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

function parseKey() { // Get the key used to download videos
	return new Promise((resolve, reject) => {
		console.log("> Fetching video key")
		req.get({
			url: 'https://linustechtips.com/main/applications/floatplane/interface/video_url.php?video_guid=a&video_quality=1080&download=1',
			headers: {
				Cookie: settings.cookie,
			}
		}, function (err, resp, body) {
			if (body.includes('</html>')) { // Check if key is invalid
				console.log('Invalid Key! Attempting to re-authenticate...');
				settings.cookies.ips4_IPSSessionFront = ''
				// If its invalid check authentication again, reconstruct the cookies and then try parsekey again if that goes through then resolve
				checkAuth().then(constructCookie).then(parseKey).then(resolve)
			} else {
				settings.key = body.replace(/.*wmsAuthSign=*/, '') // Strip everything except for the key from the generated url
				console.log('Fetched!\n');
				resolve()
			}
		});
	})
}

function logEpisodeCount(){ // Print out the current number of "episodes" for each subchannel
	console.log('=== Episode Count ===')
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

function findVideos() {
	channels.forEach(function(channel){ // Find videos for each channel
		console.log('\n==='+channel.name+'===')
		for(i=settings.maxPages; i >= 1; i--){ // For each page run this
			req.get({
			    url: channel.url+'/?page='+i,
			    headers: {
			        Cookie: settings.cookie
			    }
			  }, function(err, resp, body) {
				const $ = cheerio.load(body, { xmlMode: true }); // Load the XML of the form for the channel we are currently searching
				var postArray = $('item').toArray().slice(0, settings.maxVideos).reverse()
				postArray.forEach(function(element, i) { // For every "form post" on this page run the code below
					if (i >= settings.maxVideos) { // Break on max videos parsed
						return false
					}
					thisTitle = $(element).find('title').text() // Set the video title based off the post title
					$2 = cheerio.load($(element).find('description').text()) // Load the html for the embedded video to parse the video id
					$2('iframe').each(function(iC, elem) { // For each of the embedded videos
						iN = i + iC // Create a counter that does all videos
						video_count = $2('iframe').length
						if (video_count > 1){ // If there is more than one video on a post, just add a number to the title
							title = thisTitle+' #'+(iC+1)
						} else {
							title = thisTitle
						}
						vidID = String($2(this).attr('src')).replace('https://cms.linustechtips.com/get/player/', '') // Get the id of the video
						match = title.replace(/:/g, ' -') // Clean up the title for matching against existing videos to determine if they are already downloaded
						// Determine what channel it is from
						channel.subChannels.forEach(function(subChannel){ // For each subChannel in a channel
							if(match.indexOf(subChannel.raw) > -1) { // Check if this video is part of a subchannel
								thisChannel = subChannel
							}
						});
						if (settings.subChannelIgnore[thisChannel.formatted]) {return false} // If this video is part of a subChannel we are ignoring then break
						titlePrefix = thisChannel.formatted+' - S01E'+(thisChannel.episode_number + thisChannel.extra)
						if (settings.formatWithEpisodes == false) { titlePrefix = thisChannel.formatted } // If we arent formatting with episode numbers then remove episode numbers
						match = match.replace(thisChannel.replace, '') // Format its title based on the subchannel
						match = match.replace('@CES', '') // Dirty fix for CES2018 content
						match = sanitize(match);
						match = match.replace(/^.*[0-9].- /, '').replace('.mp4','') // Prepare it for matching files
						rawPath = settings.videoFolder+thisChannel.formatted+'/' // Create the rawPath variable that stores the path to the file
						if (settings.ignoreFolderStructure) { rawPath = settings.videoFolder } // If we are ignoring folder structure then set the rawPath to just be the video folder
						if (!fs.existsSync(rawPath)){ // Check if the path exists
						    fs.mkdirSync(rawPath); // If not create the folder needed
						}
						files = glob.sync(rawPath+'*'+match+"*.mp4") // Check if the video already exists based on the above match
						partialFiles = glob.sync(rawPath+'*'+match+"*.mp4.part") // Check if the video is partially downloaded
		  				if (files.length > 0) { // If it already exists then format the title nicely, log that it exists in console and end for this video
		  					return_title = title.replace(/:/g, ' -')
					        console.log(return_title, '== EXISTS');
					    } else {
					    	title = title.replace(/:/g, ' -')
					    	title = title.replace(thisChannel.replace, titlePrefix)
							thisChannel.episode_number += 1 // Increment the episode number for this subChannel
							title = title.replace('@CES', ' - CES') // Dirty fix for CES2018 content
							title = sanitize(title);
							if(vidID.indexOf('youtube') > -1) { // If its a youtube video then download via youtube
					    		console.log('>--', title, '== DOWNLOADING [Youtube 720p]');
								downloadYoutube(vidID, title, thisChannel, rawPath)
								if(settings.downloadArtwork) {request('https://img.youtube.com/vi/'+ytdl.getVideoID(vidID)+'/hqdefault.jpg').on('error', function (err) { // If we are downloading artwork then download artwork
									if (err) console.log(err);
								}).pipe(fs.createWriteStream(rawPath+title+'.jpg'));}
							} else {
								try{if(partial_data[match].failed){}}catch(err){partial_data[match] = {failed: true}} // Check if partialdata is corrupted and use a dirty fix if it is
								if(partialFiles.length > 0) { // If the video is partially downloaded
									if(settings.downloadArtwork) { request('https://cms.linustechtips.com/get/thumbnails/by_guid/'+vidID).pipe(fs.createWriteStream(rawPath+partial_data[match].title+'.png'))} // Save the thumbnail with the same name as the video so plex will use it
									loadCount += 1
									if (partial_data[match].failed) { // If the download failed then start from download normally
										partialFiles.length = 1;
										loadCount -= 1
									} else {
										if (liveCount < settings.maxParallelDownloads || settings.maxParallelDownloads == -1) { // If we havent hit the maxParallelDownloads or there isnt a limit then download
											process.stdout.write('>-- '+title+' == RESUMING DOWNLOAD');
											resumeDownload('https://Edge01-na.floatplaneclub.com:443/Videos/'+vidID+'/'+settings.video_res+'.mp4?wmsAuthSign='+settings.key, partial_data[match].title, thisChannel, match, rawPath) // Download the video
										} else { // Otherwise add to queue
											console.log('>-- '+title+' == RESUME QUEUED');
											queueResumeDownload('https://Edge01-na.floatplaneclub.com:443/Videos/'+vidID+'/'+settings.video_res+'.mp4?wmsAuthSign='+settings.key, partial_data[match].title, thisChannel, match, rawPath) // Queue 
										}
									}
						    	}
							    if (partialFiles.length <= 0){ // If it dosnt exist then format the title with the proper incremented episode number and log that its downloading in console
									if(settings.downloadArtwork) { request('https://cms.linustechtips.com/get/thumbnails/by_guid/'+vidID).pipe(fs.createWriteStream(rawPath+title+'.png'))} // Save the thumbnail with the same name as the video so plex will use it
									loadCount += 1
									if (liveCount < settings.maxParallelDownloads || settings.maxParallelDownloads == -1) { // If we havent hit the maxParallelDownloads or there isnt a limit then download
										process.stdout.write('>-- '+title+' == DOWNLOADING');
										download('https://Edge01-na.floatplaneclub.com:443/Videos/'+vidID+'/'+settings.video_res+'.mp4?wmsAuthSign='+settings.key, title, thisChannel, match, rawPath) // Download the video
									} else { // Otherwise add to queue
										console.log('>-- '+title+' == QUEUED');
										queueDownload('https://Edge01-na.floatplaneclub.com:443/Videos/'+vidID+'/'+settings.video_res+'.mp4?wmsAuthSign='+settings.key, title, thisChannel, match, rawPath) // Queue 
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

function queueDownload(url, title, thisChannel, match) { // Loop until current downloads is less than maxParallelDownloads and then download
	setTimeout(function(){
		if (liveCount < settings.maxParallelDownloads) {
			download(url, title, thisChannel, match)
		} else {
			queueDownload(url, title, thisChannel, match) // Run this function again continuing the loop
		}
	}, 500)
}

function queueResumeDownload(url, title, thisChannel, match) { // Loop until current downloads is less than maxParallelDownloads and then download
	setTimeout(function(){
		if (liveCount < settings.maxParallelDownloads) {
			resumeDownload(url, title, thisChannel, match)
		} else {
			queueResumeDownload(url, title, thisChannel, match) // Run this function again continuing the loop
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
	progress(request(url), {throttle: settings.downloadUpdateTime}).on('progress', function (state) { // Send the request to download the file, run the below code every downloadUpdateTime while downloading
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
		fs.rename(rawPath+title+'.mp4.part', rawPath+title+'.mp4'); // Rename the .part file to a .mp4 file
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
	var displayTitle = pad(thisChannel.raw+title.replace(/.*- /,'>').slice(0,25), 29) // Set the title for being displayed and limit it to 25 characters
	progress(request({ // Request to download the video
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
		console.log(rawPath)
		fs.rename(rawPath+title+'.mp4.part', rawPath+title+'.mp4'); // Rename it without .part
		delete partial_data[match] // Remove its partial data
		file = rawPath+title+'.mp4' // Specifies where the video is saved
		name = title.replace(/^.*[0-9].- /, '').replace('- ', '') // Generate the name used for the title in metadata (This is for plex so "episodes" have actual names over Episode1...)
		file2 = (rawPath+'TEMP_'+title+'.mp4') // Specify the temp file to write the metadata to
		ffmpegFormat(file, name, file2, {url: url, title: title, thisChannel: thisChannel, match: match}) // Format with ffmpeg for titles/plex support
	});
}

function ffmpegFormat(file, name, file2, recover) { // This function adds titles to videos using ffmpeg for compatibility with plex
	ffmpeg(file).outputOptions("-metadata", "title="+name, "-map", "0", "-codec", "copy").saveToFile(file2).on('error', function(err, stdout, stderr) { // Add title metadata
    	//console.log('An error occurred: ' + err.message, err, stderr); // Log errors for now, recover is broke af
    	if (recover.match && err) { // If there is a error and its not a youtube video then try redownload the file
    		download(recover.url, recover.title, recover.thisChannel, recover.match)
    	} else if(err) { // If it is a youtube video then just do nothing because somethings broken atm
    		downloadYoutube(recover.url, recover.title, recover.thisChannel)
    	}
	}).on('end', function() { // Save the title in metadata
		fs.rename(file2, file)
	})
}

function saveData() { // Function for saving partial data, just writes out the variable to disk
	fs.writeFile("./partial.json", JSON.stringify(partial_data), 'utf8', function (err) {
    	if (err) console.log(err)
	});
}
