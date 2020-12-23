function downloadYoutube(video) {
	liveCount += 1;

	let videoPart = video.rawPath + video.title + ".video.mp4";
	let audioPart = video.rawPath + video.title + ".audio.mp3";

	let displayTitleVideo = pad(`${colourList[video.subChannel]}${video.subChannel}\u001b[38;5;196m YT-Video>\u001b[0m${video.shortTitle.slice(0, 25)}`, 36); // Set the title for being displayed and limit it to 25 characters
	let displayTitleAudio = pad(`${colourList[video.subChannel]}${video.subChannel}\u001b[38;5;196m YT-Audio>\u001b[0m${video.shortTitle.slice(0, 25)}`, 36); // Set the title for being displayed and limit it to 25 characters

	ytdl.getInfo(video.url, (err, info) => {
		video.description = info.description;
		video.releaseDate = new Date(info.published);
		videos[video.url] = {
			file: video.rawPath + video.title + ".mp4", // Specifies where the video is saved,
			videoFile: videoPart,
			audioFile: audioPart,
			artworkFile: video.rawPath + video.title + "." + settings.extras.artworkFormat,
			partial: true,
			subChannel: video.subChannel,
			releaseDate: new Date(info.published)
		};
		saveVideoData();
		if (err) fLog(`WAN > ytdl > An error occoured for "${video.title}": ${err}`);
		let videoThreadPromises = [];
		let audioThreadPromises = [];

		let videoDisplayInterval = null;
		let audioDisplayInterval = null;

		let bestAudio = ytdl.chooseFormat(ytdl.filterFormats(info.formats, "audioonly"), { quality: settings.TheWANShow.audio.quality });
		let bestVideo = ytdl.chooseFormat(ytdl.filterFormats(info.formats, "videoonly"), { quality: settings.TheWANShow.video.quality });

		let cLenVideo = bestVideo.clen / settings.TheWANShow.downloadThreads;
		let cLenAudio = bestAudio.clen / settings.TheWANShow.downloadThreads;

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

		let videoBar = multi.newBar(":title [:bar] :percent :stats", { // Format with ffmpeg for titles/plex support
			complete: "\u001b[42m \u001b[0m",
			incomplete: "\u001b[41m \u001b[0m",
			width: 30,
			total: 100
		});
		let audioBar = multi.newBar(":title [:bar] :percent :stats", { // Format with ffmpeg for titles/plex support
			complete: "\u001b[42m \u001b[0m",
			incomplete: "\u001b[41m \u001b[0m",
			width: 30,
			total: 100
		});

		if (settings.TheWANShow.audio.saveSeperately || settings.TheWANShow.combineAndSaveAudioVideo) {
			for (let i = 0; i < settings.TheWANShow.downloadThreads; i++) {
				audioThreadPromises.push(
					new Promise(function (resolve, reject) {
						progress(request({
							url: bestAudio.url,
							headers: {
								Range: `bytes=${Math.floor(cLenAudio * i)}-${Math.floor(((cLenAudio * i) + cLenAudio))}`
							}
						}), { throttle: 250 }).on("progress", function (state) { // Run the below code every downloadUpdateTime while downloading
							audioState.transferred[i] = state.size.transferred;
							audioState.speed[i] = state.speed;
							audioState.total[i] = state.size.total;
							audioState.timeRemaining[i] = state.time.remaining;
						}).on("end", function () { resolve(); }).pipe(fs.createWriteStream(audioPart, { start: Math.floor(cLenAudio * i), flags: "w+" })).on("finish", function () { });
					})
				);
			}
		}

		if (settings.TheWANShow.video.saveSeperately || settings.TheWANShow.combineAndSaveAudioVideo) {
			for (let i = 0; i < settings.TheWANShow.downloadThreads; i++) {
				videoThreadPromises.push(
					new Promise(function (resolve, reject) {
						progress(request({
							url: bestVideo.url,
							headers: {
								Range: `bytes=${Math.floor(cLenVideo * i)}-${Math.floor(((cLenVideo * i) + cLenVideo))}`
							}
						}), { throttle: 250 }).on("progress", function (state) { // Run the below code every downloadUpdateTime while downloading
							videoState.transferred[i] = state.size.transferred;
							videoState.speed[i] = state.speed;
							videoState.total[i] = state.size.total;
							videoState.timeRemaining[i] = state.time.remaining;
						}).on("end", function () { resolve(); }).pipe(fs.createWriteStream(videoPart, { start: Math.floor(cLenVideo * i), flags: "w+" })).on("finish", function () { });
					})
				);
			}
		}

		if (settings.TheWANShow.video.saveSeperately || settings.TheWANShow.combineAndSaveAudioVideo) videoDisplayInterval = setInterval(function () {
			let videoSum = {
				transferred: videoState.transferred.reduce((a, b) => a + b),
				speed: videoState.speed.reduce((a, b) => a + b),
				total: videoState.total.reduce((a, b) => a + b),
				timeRemaining: videoState.timeRemaining.reduce((a, b) => a + b)
			};
			if (videoSum.speed == null) { videoSum.speed = 0; } // If the speed is null set it to 0
			videoBar.update(videoSum.transferred / videoSum.total); // Update the bar's percentage with a manually generated one as we cant use progresses one due to this being a partial download
			videoBar.tick({ "title": displayTitleVideo, "stats": `${(((videoSum.speed) / 1024000)).toFixed(2)}MB/s ${(((videoSum.transferred) / 1024000)).toFixed(0)}/${(videoSum.total / 1024000).toFixed(0)}MB ETA: ${Math.floor(videoSum.timeRemaining / 60)}m ${Math.floor(videoSum.timeRemaining) % 60}s` });
		}, settings.downloadUpdateTime);

		if (settings.TheWANShow.audio.saveSeperately || settings.TheWANShow.combineAndSaveAudioVideo) audioDisplayInterval = setInterval(function () {
			let audioSum = {
				transferred: audioState.transferred.reduce((a, b) => a + b),
				speed: audioState.speed.reduce((a, b) => a + b),
				total: audioState.total.reduce((a, b) => a + b),
				timeRemaining: audioState.timeRemaining.reduce((a, b) => a + b)
			};
			if (audioSum.speed == null) { audioSum.speed = 0; } // If the speed is null set it to 0
			audioBar.update(audioSum.transferred / audioSum.total); // Update the bar's percentage with a manually generated one as we cant use progresses one due to this being a partial download
			audioBar.tick({ "title": displayTitleAudio, "stats": `${(((audioSum.speed) / 1024000)).toFixed(2)}MB/s ${(((audioSum.transferred) / 1024000)).toFixed(0)}/${(audioSum.total / 1024000).toFixed(0)}MB ETA: ${Math.floor(audioSum.timeRemaining / 60)}m ${Math.floor(audioSum.timeRemaining) % 60}s` });
		}, settings.downloadUpdateTime);

		Promise.all(audioThreadPromises).then(() => {
			clearInterval(audioDisplayInterval);
			if (settings.TheWANShow.audio.saveSeperately || settings.TheWANShow.combineAndSaveAudioVideo) {
				audioBar.update(1); // Set the progress bar to 100%
				audioBar.tick({ "title": displayTitleAudio, "stats": `${(bestAudio.clen / 1024000).toFixed(0)}/${(bestAudio.clen / 1024000).toFixed(0)}MB` });
				audioBar.terminate();
			}
			Promise.all(videoThreadPromises).then((values) => {
				clearInterval(videoDisplayInterval);
				if (settings.TheWANShow.video.saveSeperately || settings.TheWANShow.combineAndSaveAudioVideo) {
					videoBar.update(1); // Set the progress bar to 100%
					videoBar.tick({ "title": displayTitleVideo, "stats": `${(bestVideo.clen / 1024000).toFixed(0)}/${(bestVideo.clen / 1024000).toFixed(0)}MB` });
					videoBar.terminate();
				}
				if (settings.TheWANShow.combineAndSaveAudioVideo) {
					ffmpeg()
						.input(videoPart)
						.videoCodec("copy")
						.input(audioPart)
						.audioCodec("copy")
						.outputOptions("-metadata", "title=" + video.shortTitle, "-metadata", "AUTHOR=" + video.subChannel, "-metadata", "YEAR=" + Date(video.releaseDate), "-metadata", "description=" + video.description, "-metadata", "synopsis=" + video.description, "-strict", "-2")
						.saveToFile(videos[video.url].file)
						.on("error", function (err, stdout, stderr) { // Add title metadata
							fLog(`ffmpeg > An error occoured for "${video.title}": ${err}`);
						}).on("end", () => {
							liveCount -= 1;
							videos[video.url].partial = false;
							videos[video.url].saved = true;
							saveVideoData();
							if (queueCount == -1) {
								updateLibrary(); // If we are at the last video then run a plex collection update
								backupVideoData();
							}
							if (!settings.TheWANShow.audio.saveSeperately) fs.unlink(audioPart, err => {
								if (err) {
									fLog(`[1024] WAN > ffmpeg > An error occoured while unlinking "${audioPart}": ${err}`);
									console.log(`[1025] An error occoured while unlinking "${audioPart}": ${err}`);
								}
							});
							if (!settings.TheWANShow.video.saveSeperately) fs.unlink(videoPart, err => {
								if (err) {
									fLog(`[1030] WAN > ffmpeg > An error occoured while unlinking "${videoPart}": ${err}`);
									console.log(`[1031] An error occoured while unlinking "${videoPart}": ${err}`);
								}
							});
						});
				} else {
					liveCount -= 1;
					videos[video.url].partial = false;
					videos[video.url].saved = true;
					saveVideoData();
					if (queueCount == -1) {
						updateLibrary(); // If we are at the last video then run a plex collection update
						backupVideoData();
					}
				}
			});
		});
	});
}