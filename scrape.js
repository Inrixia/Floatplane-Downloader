// Include the libraries we need
var request = require('request');
var cheerio = require('cheerio');
var progress = require('request-progress');
var sanitize = require("sanitize-filename");
var ffmpeg = require('fluent-ffmpeg');
var glob = require("glob");
var mv = require('mv');
var settings = require('./settings.json');
var prompt = require('prompt');
if(process.platform === 'win32'){ // If not using windows attempt to use linux ffmpeg
	process.env.FFMPEG_PATH = "./node_modules/ffmpeg-binaries/bin/ffmpeg.exe"
} else {
	process.env.FFMPEG_PATH = "/usr/bin/ffmpeg"
}
var fs = require('fs');
var count = settings.maxVideos; // Number of videos to look back through minus 1 (For the floatplane info post) Max 25 (Per Channel)
var loadCount = 0;
var channels = []
if (settings.useFloatplane == true){
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

console.log('\x1Bc'); // Clear the console
// Check that the user is authenticated, then construct cookies, get the video key, log the current episodes and finally check for new videos
// The below line triggers the main functions of the script
checkAuth().then(constructCookie).then(parseKey).then(logEpisodeCount).then(findVideos)

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
				'content-type': 'application/x-www-form-urlencoded'
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
				Cookie: settings.cookie
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
			subChannel.episode_number = (glob.sync(settings.videoFolder+"*/*"+subChannel.formatted+"*.mp4").length + 1)
			console.log(subChannel.formatted+':', subChannel.episode_number-1)
		});
	});
	console.log();
}

function findVideos() {
	channels.forEach(function(channel){ // Find videos for each channel
		var url = channel.url
		req.get({
		    url: channel.url,
		    headers: {
		        Cookie: settings.cookie
		    }
		  }, function(err, resp, body) {
			const $ = cheerio.load(body, { xmlMode: true }); // Load the XML of the form for the channel we are currently searching
			console.log('\n==='+channel.name+'===')
			$('item').each(function(i, elem) { // For every "form post" on this page run the code below
				if (i == count) { // Break on max videos parsed
					return false
				}
				thisTitle = $(this).find('title').text() // Set the video title based off the post title
				$2 = cheerio.load($(this).find('description').text()) // Load the html for the embedded video to parse the video id
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
					match = match.replace(thisChannel.replace, thisChannel.formatted+'S01E'+(thisChannel.episode_number + thisChannel.extra)) // Format its title based on the subchannel
					match = sanitize(match);
					match = match.replace(/^.*[0-9].- /, '').replace('.mp4','') // Prepare it for matching files
					files = glob.sync(settings.videoFolder+"*/*"+match+"*.mp4") // Check if the video already exists based on the above match
	  				if (files.length > 0) { // If it already exists then format the title nicely, log that it exists in console and end for this video
	  					return_title = title.replace(/:/g, ' -')
	  					// Existing file *nice* name formatting
	  					//return_title = return_title.replace(thisChannel.replace, thisChannel.formatted)
				        console.log(sanitize(return_title), '== EXISTS');
				    } else { // If it dosnt exist then format the title with the proper incremented episode number and log that its downloading in console
				    	title = title.replace(/:/g, ' -')
				    	// Downloaded file name formatting
				    	title = title.replace(thisChannel.replace, thisChannel.formatted+' - S01E'+(thisChannel.episode_number + thisChannel.extra))
						thisChannel.episode_number += 1 // Increment the episode number for this subChannel
						title = sanitize(title);
				    	console.log('>--', title, '== DOWNLOADING');
						request('https://cms.linustechtips.com/get/thumbnails/by_guid/'+vidID).pipe(fs.createWriteStream(settings.videoFolder+thisChannel.formatted+'/'+title+'.png')); // Save the thumbnail with the same name as the video so plex will use it
						loadCount += 1
						download('https://Edge01-na.floatplaneclub.com:443/Videos/'+vidID+'/'+settings.video_res+'.mp4?wmsAuthSign='+settings.key, title, thisChannel, loadCount) // Download the video
				    }
				})
			})
		});
	})
}

function download(url, title, thisChannel, i) {
	progress(request(url), { // body contains only the download url given from requesting the generated url, Send a request with the download url to start downloading the video
	}).on('progress', function (state) {
		if (loadCount == i) { // If at the last video of the ones downloading clear the screen
			setTimeout(function() {
				console.log('\x1Bc');
			}, 900);
		}
		console.log('Downloading:', title); // Below is just printing out the download info
		console.log('Downloaded:', (state.percent*100).toFixed(2) + '%');
		console.log('Time Remaining:', Math.floor(state.time.remaining)%60 + 's', Math.floor(state.time.remaining/60) + 'm');
		if (state.speed != null) {
			console.log('Speed:', ((state.speed/100000)/8).toFixed(2) + ' MB/s');
		}
		console.log('\n')
	}).on('error', function (err) {
		console.log(err);
	}).on('end', function () {
		loadCount -= 1
	}).pipe(fs.createWriteStream(settings.videoFolder+thisChannel.formatted+'/'+title+'.mp4')).on('finish', function(){ // Save the downloaded video using the title generated
		file = settings.videoFolder+thisChannel.formatted+'/'+title+'.mp4'
		name = file.replace(/^.*[0-9].- /, '').replace('- ', '').replace('.mp4','') // Generate the name used for the title in metadata (This is for plex so "episodes" have actual names over Episode1...)
		file2 = ('TEMP_'+title+'.mp4').replace(/ /g, '') // Specify the temp file to write the metadata to
		ffmpeg(file).outputOptions("-metadata", "title="+name, "-map", "0", "-codec", "copy").saveToFile(file2).on('end', function() { // Save the title in metadata
			mv(file2, file, function(err){ // Overwrite the old video with the new one with the updated title
				if (err) console.error("Error moving file...", err);
			})
		})
	});
}
