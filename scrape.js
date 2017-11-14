// include the libraries we need
var request = require('request');
var cheerio = require('cheerio');
var progress = require('request-progress');
var sanitize = require("sanitize-filename");
var ffmpeg = require('fluent-ffmpeg');
var glob = require("glob");
var mv = require('mv');
process.env.FFMPEG_PATH = "C:/Users/Inrix/MkvToMp4_0.224/Tools/ffmpeg/x64/ffmpeg.exe"
var fs = require('fs');
var cookies = 'ips4_IPSSessionFront=##; ips4_device_key=##; ips4_hasJS=true; ips4_ipsTimezone=Pacific/Auckland; ips4_login_key=##; ips4_member_id=##; ips4_pass_hash=##; muxData=mux_viewer_id=##; video_res=1080p'
var count = 5; // Number of videos to look back through minus 1 (For the floatplane info post) Max 25
var loadCount = 0;
episode_number_ltt = glob.sync("./Videos/*Linus Tech Tips*.mp4").length // Get the current number of "episodes" for each LTT channel
episode_number_tq = glob.sync("./Videos/*Techquickie*.mp4").length
episode_number_fp = glob.sync("./Videos/*Floatplane*.mp4").length
console.log('Episode Numbers', 'LTT:', episode_number_ltt, 'TQ:', episode_number_tq, 'FP:', episode_number_fp) // Just so you can see the current number of videos
episode_number_ltt += 1 // Increment by one so new videos dont use existing "episode" numbers
episode_number_tq += 1
episode_number_fp += 1
// set some defaults
req = request.defaults({
	jar: true,
	rejectUnauthorized: false, 
	followAllRedirects: true
});


req.get({
    url: "https://linustechtips.com/main/forum/91-lmg-floatplane/", // Get the floatplane index page
    headers: {
        Cookie: cookies
    }
  }, function(err, resp, body) {
	const $ = cheerio.load(body)
	$('.cTopicList').children().each(function(i, elem) { // For every form post on this page run the code below
		if (i == count){ // If we have gone over count ammount of posts stop
			return false;
		} else if (i != 0) { // We dont want to try and get video info from the first post which is the sticky help thread
			var title = $(this).children().eq(1).children().eq(0).children().eq(0).children().eq(0).attr('title') // Get the title of the video from the post title
			var url = $(this).children().eq(1).children().eq(0).children().eq(0).children().eq(0).attr('href') // Get the url of the form post containing the video
			match = title.replace(/:/g, ' -') // Clean up the title for matching against existing videos to determine if they are already downloaded
			if(match.indexOf('LTT') > -1) {
				match = match.replace('LTT', 'Linus Tech Tips - S01E'+episode_number_ltt)
			} else if (match.indexOf('TQ') > -1){
				match = match.replace('TQ', 'Techquickie - S01E'+episode_number_tq)
			} else if (match.indexOf('FP') > -1){
				match = match.replace(/.*FP.*-/, 'Floatplane Exclusive - S01E'+episode_number_fp+' -')
			}
			match = sanitize(match);
			match = match.replace(/^.*[0-9].- /, '').replace('.mp4','')
			glob("./Videos/*"+match+"*.mp4", function (er, files) { // Check if the video already exists
  				if (files.length > 0) { // If it does then format the title nicely, log that it exists in console and end for this video
  					return_title = title.replace(/:/g, ' -')
  					if(return_title.indexOf('LTT') > -1) {
						return_title = return_title.replace('LTT', 'Linus Tech Tips')
					} else if (return_title.indexOf('TQ') > -1){
						return_title = return_title.replace('TQ', 'Techquickie')
					} else if (return_title.indexOf('FP') > -1){
						return_title = return_title.replace(/.*FP.*-/, 'Floatplane Exclusive - ')
					}
			        console.log(sanitize(return_title), '== EXISTS');
			    } else { // If it dosnt exist then format the title with the proper incremented episode number and log that its downloading in console
			    	title = title.replace(/:/g, ' -')
					if(title.indexOf('LTT') > -1) {
						title = title.replace('LTT', 'Linus Tech Tips - S01E'+episode_number_ltt)
						episode_number_ltt += 1
					} else if (title.indexOf('TQ') > -1){
						title = title.replace('TQ', 'Techquickie - S01E'+episode_number_tq)
						episode_number_tq += 1
					} else if (title.indexOf('FP') > -1){
						title = title.replace(/.*FP.*-/, 'Floatplane Exclusive - S01E'+episode_number_fp+' -')
						episode_number_fp += 1
					}
					title = sanitize(title);
			    	console.log(title, '== DOWNLOADING');
			    	loadCount = i; // Set loadcount to be equal to the current video number (This is the number of the form post from top down, eg video 5 = the 5th post)
					req.get({ // Open the form post for that video
				    	url: url,
					    headers: {
					        Cookie: cookies
					     }
					}, function(err, resp, body) {
						const $ = cheerio.load(body)
						var vidID = $('.floatplane-script').attr('data-video-guid'); // Get the video ID from the post
						var url = 'https://linustechtips.com/main/applications/floatplane/interface/video_url.php?video_guid='+ vidID +'&video_quality=1080&download=1'; // Generate the url that will return the download url for this video (To change the quality change 1080 to the resoloution you want)
						var img_url = 'https://cms.linustechtips.com/get/thumbnails/by_guid/'+vidID; // Generate the url for getting the thumbnail for the video
						request(img_url).pipe(fs.createWriteStream(__dirname + '/Videos/'+title+'.png')); // Save the thumbnail with the same name as the video so plex will use it
						req.get({ // Request the download url using the url generated above
					    	url: url,
						    headers: {
						    	Cookie: cookies
						    }
						}, function(err, resp, body) {
				 			progress(request(body), { // body contains only the download url given from requesting the generated url, Send a request with the download url to start downloading the video
				 			}).on('progress', function (state) {
				 				if (loadCount == i) { // If at the last video of the ones downloading clear the screen
				 					console.log('\x1Bc');
				    			}
				    			console.log('Downloading:', title); // Below is just printing out the download info
				    			console.log('Downloaded:', (state.percent*100).toFixed(2) + '%');
				    			console.log('Time Remaining:', state.time.remaining + 's');
				    			if (state.speed != null) {
									console.log('Speed:', ((state.speed/100000)/8).toFixed(2) + ' MB/s');
				    			}
				    			console.log('\n')
							}).on('error', function (err) {
				    			console.log(err);
							}).on('end', function () {
							}).pipe(fs.createWriteStream('./Videos/'+title+'.mp4')).on('finish', function(){ // Save the downloaded video using the title generated
								file = './Videos/'+title+'.mp4'
								name = file.replace(/^.*[0-9].- /, '').replace('- ', '').replace('.mp4','') // Generate the name used for the title in metadata (This is for plex so "episodes" have actual names over Episode1...)
								file2 = ('TEMP_'+title+'.mp4').replace(/ /g, '') // Specify the temp file to write the metadata to
								ffmpeg(file).outputOptions("-metadata", "title="+name, "-map", "0", "-codec", "copy").saveToFile(file2).on('end', function() { // Save the title in metadata
									mv(file2, file, function(err){ // Overwrite the old video with the new one with the updated title
										if (err) console.error("Error moving file...", err);
									})
								})
							});
						});
					});
			    }
			});
		}
	})
})