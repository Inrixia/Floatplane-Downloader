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

// process.on('uncaughtException', function(err) { // "Nice" Error handling, will obscure unknown errors, remove or comment for full debugging
// 	let isJSONErr = (err.toString().indexOf('Unexpected string in JSON') > -1 || err.toString().indexOf('Unexpected end of JSON input') > -1 || err.toString().indexOf('Unexpected token') > -1)
// 	if (err == "TypeError: JSON.parse(...).forEach is not a function") { // If this error
// 		fLog("ERROR > Failed to login please check your login credentials!")
// 		console.log('\u001b[41mERROR> Failed to login please check your login credentials!\u001b[0m') // Then print out what the user should do\
// 		settings.cookie = [];
// 		settings.cookies = {};
// 		saveSettings().then(restartScript());
// 	} if (err == "ReferenceError: thisChannel is not defined") {
// 		fLog(`ERROR > Error with "maxVideos"! Please set "maxVideos" to something other than ${settings.maxVideos} in settings.json`)
// 		console.log(`\u001b[41mERROR> Error with "maxVideos"! Please set "maxVideos" to something other than ${settings.maxVideos} in settings.json\u001b[0m`)
// 	} if(isJSONErr && err.toString().indexOf('partial.json') > -1) { // If this error and the error is related to this file
// 		logstream.write(`${Date()} == ERROR > partial.json > Corrupt partial.json file! Attempting to recover...`)
// 		console.log('\u001b[41mERROR> Corrupt partial.json file! Attempting to recover...\u001b[0m');
// 		fs.writeFile("./partial.json", '{}', 'utf8', function (error) { // Just write over the corrupted file with {}
// 			if (error) {
// 				logstream.write(`${Date()} == "+'ERROR > partial.json > Recovery failed! Error: ${error}\n`);
// 				console.log(`\u001b[41mRecovery failed! Error: ${error}\u001b[0m`)
// 				process.exit()
// 			} else {
// 				logstream.write(`${Date()} == ERROR > videos.json > Recovered! Restarting script...\n`);
// 				console.log('\u001b[42mRecovered! Restarting script...\u001b[0m');
// 				restartScript();
// 			}
// 		});
// 	} if(isJSONErr && err.toString().indexOf('videos.json') > -1) { // If this error and the error is related to this file
// 		logstream.write(`${Date()} == ERROR > videos.json > Corrupt videos.json file! Attempting to recover...`)
// 		console.log('\u001b[41mERROR> Corrupt videos.json file! Attempting to recover...\u001b[0m');
// 		try {
// 			videos = require('./videos.json.backup')
// 			saveVideoData();
// 			logstream.write(`${Date()} == ERROR > videos.json > Recovered from backup! Restarting script...`)
// 			console.log('\u001b[42mRecovered from backup! Restarting script...\u001b[0m');
// 			restartScript();
// 		} catch (error) {
// 			fs.writeFile("./videos.json", '{}', 'utf8', function (error) { // Just write over the corrupted file with {}
// 				if (error) {
// 					logstream.write(`${Date()} == ERROR > videos.json > Recovery failed! Error: ${error}`)
// 					console.log(`\u001b[41mRecovery failed! Error: ${error}\u001b[0m`)
// 					process.exit()
// 				} else {
// 					logstream.write(`${Date()} == ERROR > videos.json > Recovered! Restarting script...`)
// 					console.log('\u001b[42mRecovered! Restarting script...\u001b[0m');
// 					restartScript();
// 				}
// 			});
// 		}
// 	} else {
// 		console.log(err)
// 		logstream.write(`${Date()} == UNHANDLED ERROR > ${err}`)
// 		//throw err
// 	}
// });

// // Check if videos file exists.
// if (!fs.existsSync('./videos.json')) {
// 	// Create file
// 	fs.appendFile('./videos.json', '{}', function (err) {
// 		// Tell the user the script is restarting (with colors)
// 		fLog(`Pre-Init > videos.json does not exist! Created partial.json and restarting script...`)
// 		console.log('\u001b[33mCreated videos.json. Restarting script...\u001b[0m');
// 		// Restart here to avoid node trying to recover when it loads partial.json
// 		restartScript();
// 	});
// }
// // Put partial detection in a timeout to avoid it quitting before the videos check
// setTimeout(function() {
// 	// Check if partial file exists.
// 	if (!fs.existsSync('./partial.json')) {
// 		// Create file
// 		fs.appendFile('./partial.json', '{}', function (err) {
// 			// Tell the user the script is restarting (with colors)
// 			fLog(`Pre-Init > partial.json does not exist! Created partial.json and restarting script...`)
// 			console.log('\u001b[33mCreated partial.json. Restarting script...\u001b[0m');
// 			// Restart here to avoid node trying to recover when it loads partial.json
// 			restartScript();
// 		});
// 	}
// }, 100);


const videos = require('./videos.json'); // Persistant storage of videos downloaded

// http://www.lihaoyi.com/post/BuildyourownCommandLinewithANSIescapecodes.html
// Colours Reference ^^

var episodeList = {}

var queueCount = -1; // Number of videos currently queued/downloading
var liveCount = 0; // Number of videos actually downloading
var bestEdge = {} // Variable used to store the best edge server determined by lat and long compared to the requesters ip address

// Finish Init, Sart Script



function printLines() { // Printout spacing for download bars based on the number of videos downloading
	return new Promise((resolve, reject) => {
		setTimeout(function(){
			console.log('\n'.repeat(((settings.maxParallelDownloads != -1) ? settings.maxParallelDownloads : queueCount)/2))
		},1500)
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
