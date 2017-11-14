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
//var episode_number_tq = Number(fs.readFileSync('tq_episode.txt', 'utf8'));
//var episode_number_ltt = Number(fs.readFileSync('ltt_episode.txt', 'utf8'));
episode_number_ltt = glob.sync("./Videos/*Linus Tech Tips*.mp4").length
episode_number_tq = glob.sync("./Videos/*Techquickie*.mp4").length
episode_number_fp = glob.sync("./Videos/*Floatplane*.mp4").length
console.log('Episode Numbers', 'LTT:', episode_number_ltt, 'TQ:', episode_number_tq, 'FP:', episode_number_fp)
episode_number_ltt += 1
episode_number_tq += 1
episode_number_fp += 1
// set some defaults
req = request.defaults({
	jar: true,
	rejectUnauthorized: false, 
	followAllRedirects: true
});


// scrape the page
req.get({
    url: "https://linustechtips.com/main/forum/91-lmg-floatplane/",
    headers: {
        Cookie: cookies
    }
  }, function(err, resp, body) {
	const $ = cheerio.load(body)
	$('.cTopicList').children().each(function(i, elem) {
		if (i == count){
			return false;
		} else if (i != 0) {
			var title = $(this).children().eq(1).children().eq(0).children().eq(0).children().eq(0).attr('title')
			var url = $(this).children().eq(1).children().eq(0).children().eq(0).children().eq(0).attr('href')
			match = title.replace(/:/g, ' -')
			if(match.indexOf('LTT') > -1) {
				match = match.replace('LTT', 'Linus Tech Tips - S01E'+episode_number_ltt)
			} else if (match.indexOf('TQ') > -1){
				match = match.replace('TQ', 'Techquickie - S01E'+episode_number_tq)
			} else if (match.indexOf('FP') > -1){
				match = match.replace(/.*FP.*-/, 'Floatplane Exclusive - S01E'+episode_number_fp+' -')
			}
			match = sanitize(match);
			match = match.replace(/^.*[0-9].- /, '').replace('.mp4','')
			glob("./Videos/*"+match+"*.mp4", function (er, files) {
  				if (files.length > 0) {
  					return_title = title.replace(/:/g, ' -')
  					if(return_title.indexOf('LTT') > -1) {
						return_title = return_title.replace('LTT', 'Linus Tech Tips')
					} else if (return_title.indexOf('TQ') > -1){
						return_title = return_title.replace('TQ', 'Techquickie')
					} else if (return_title.indexOf('FP') > -1){
						return_title = return_title.replace(/.*FP.*-/, 'Floatplane Exclusive - ')
					}
			        console.log(sanitize(return_title), '== EXISTS');
			    } else {
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
			    	loadCount = i;
					req.get({
				    	url: url,
					    headers: {
					        Cookie: cookies
					     }
					}, function(err, resp, body) {
						const $ = cheerio.load(body)
						var vidID = $('.floatplane-script').attr('data-video-guid');
						var url = 'https://linustechtips.com/main/applications/floatplane/interface/video_url.php?video_guid='+ vidID +'&video_quality=1080&download=1';
						var img_url = 'https://cms.linustechtips.com/get/thumbnails/by_guid/'+vidID;
						request(img_url).pipe(fs.createWriteStream(__dirname + '/Videos/'+title+'.png'));
						req.get({
					    	url: url,
						    headers: {
						    	Cookie: cookies
						    }
						}, function(err, resp, body) {
				 			progress(request(body), {
				 			}).on('progress', function (state) {
				 				if (loadCount == i) {
				 					console.log('\x1Bc');
				    			}
				    			console.log('Downloading:', title);
				    			console.log('Downloaded:', (state.percent*100).toFixed(2) + '%');
				    			console.log('Time Remaining:', state.time.remaining + 's');
				    			if (state.speed != null) {
									console.log('Speed:', ((state.speed/100000)/8).toFixed(2) + ' MB/s');
				    			}
				    			console.log('\n')
							}).on('error', function (err) {
				    			console.log(err);
							}).on('end', function () {
							}).pipe(fs.createWriteStream('./Videos/'+title+'.mp4')).on('finish', function(){
								file = './Videos/'+title+'.mp4'
								name = file.replace(/^.*[0-9].- /, '').replace('- ', '').replace('.mp4','')
								file2 = ('TEMP_'+title+'.mp4').replace(/ /g, '')
								ffmpeg(file).outputOptions("-metadata", "title="+name, "-map", "0", "-codec", "copy").saveToFile(file2).on('end', function() {
									mv(file2, file, function(err){
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