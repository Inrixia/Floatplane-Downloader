const request = require('request')
const fs = require('fs-extra')
const AdmZip = require('adm-zip')

getUpdate().then(updateSettings).then(moveFiles).then(deleteFiles)

var useBeta = false

function getUpdate() {
	return new Promise((resolve, reject) => {
		request.get({
			url: 'https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/latest.json',
		, function (err, resp, body) {
			updateInfo = JSON.parse(body)
			if (useBeta) {
				updateInfo.version = updateInfo.beta

			console.log('Now updating to version '+updateInfo.version+'\n\n')
			request('https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/releases/'+updateInfo.version+'.zip').on('error', function (err) {
				console.log(err);
			).pipe(fs.createWriteStream("./update.zip")).on('finish', function(){
				zip = AdmZip("./update.zip")
				zip.getEntries().forEach(function(zipEntry) {
					if (zipEntry.entryName.indexOf('videos') == -1) {
					    zip.extractEntryTo(zipEntry.entryName, './update', false, true)

				);
				fs.unlink("./update.zip")
				resolve()
			);
		);
	)



function updateSettings(){
	return new Promise((resolve, reject) => {
		var newSettings = JSON.parse(fs.readFileSync('./update/settings.json', 'utf8'));
		var settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
		newSettings.version = updateInfo.version
		if (settings.videoFolder != null) newSettings.videoFolder = settings.videoFolder
		if (settings.maxVideos != null) newSettings.maxVideos = settings.maxVideos
		if (settings.maxParallelDownloads != null) newSettings.maxParallelDownloads = settings.maxParallelDownloads
		if (settings.repeatScript != null) newSettings.repeatScript = settings.repeatScript

		if (settings.extras != null) {
			if (settings.extras.downloadArtwork != null) newSettings.extras.downloadArtwork = settings.extras.downloadArtwork
			if (settings.extras.artworkFormat != null) newSettings.extras.artworkFormat = settings.extras.artworkFormat
			if (settings.extras.saveNfo != null) newSettings.extras.artworkFormat = settings.extras.artworkFormat
		} else { // Support for pre 4.6.0 settings rewrite
			if (settings.downloadArtwork != null) newSettings.extras.downloadArtwork = settings.downloadArtwork
			if (settings.artworkFormat != null) newSettings.extras.artworkFormat = settings.artworkFormat
			if (settings.saveNfo != null) newSettings.extras.artworkFormat = settings.artworkFormat
		}

		if (settings.fileFormatting != null) {
			if (settings.fileFormatting.formatWithEpisodes != null) newSettings.fileFormatting.formatWithEpisodes = settings.fileFormatting.formatWithEpisodes
			if (settings.fileFormatting.formatWithDate != null) newSettings.fileFormatting.formatWithDate = settings.fileFormatting.formatWithDate
			if (settings.fileFormatting.formatWithSubChannel != null) newSettings.fileFormatting.formatWithSubChannel = settings.fileFormatting.formatWithSubChannel
			if (settings.fileFormatting.yearsAsSeasons != null) newSettings.fileFormatting.yearsAsSeasons = settings.fileFormatting.yearsAsSeasons
			if (settings.fileFormatting.monthsAsSeasons != null) newSettings.fileFormatting.monthsAsSeasons = settings.fileFormatting.monthsAsSeasons
			if (settings.fileFormatting.ignoreFolderStructure != null) newSettings.fileFormatting.ignoreFolderStructure = settings.fileFormatting.ignoreFolderStructure
		} else { // Support for pre 4.6.0 settings rewrite
			if (settings.formatWithEpisodes != null) newSettings.fileFormatting.formatWithEpisodes = settings.formatWithEpisodes
			if (settings.formatWithDate != null) newSettings.fileFormatting.formatWithDate = settings.formatWithDate
			if (settings.formatWithSubChannel != null) newSettings.fileFormatting.formatWithSubChannel = settings.formatWithSubChannel
			if (settings.yearsAsSeasons != null) newSettings.fileFormatting.yearsAsSeasons = settings.yearsAsSeasons
			if (settings.monthsAsSeasons != null) newSettings.fileFormatting.monthsAsSeasons = settings.monthsAsSeasons
			if (settings.ignoreFolderStructure != null) newSettings.fileFormatting.ignoreFolderStructure = settings.ignoreFolderStructure
		}
		if (settings.ffmpeg != null) newSettings.ffmpeg = settings.ffmpeg
		if (settings.downloadUpdateTime != null) newSettings.downloadUpdateTime = settings.downloadUpdateTime
		if (settings.checkForNewSubscriptions != null) newSettings.checkForNewSubscriptions = settings.checkForNewSubscriptions

		if (settings.TheWANShow == true) newSettings.TheWANShow.enabled = settings.TheWANShow // Support for pre 4.6.0 settings rewrite
	 	else if (settings.TheWANShow != null) {
			if (settings.TheWANShow.enabled != null) newSettings.TheWANShow.enabled = settings.TheWANShow.enabled
			if (settings.TheWANShow.audio != null) {
				if (settings.TheWANShow.audio.quality != null) newSettings.TheWANShow.audio.quality = settings.TheWANShow.audio.quality
				if (settings.TheWANShow.audio.saveSeperately != null) newSettings.TheWANShow.audio.saveSeperately = settings.TheWANShow.audio.saveSeperately
			}
			if (settings.TheWANShow.video != null) {
				if (settings.TheWANShow.video.quality != null) newSettings.TheWANShow.video.quality = settings.TheWANShow.video.quality
				if (settings.TheWANShow.video.saveSeperately != null) newSettings.TheWANShow.video.saveSeperately = settings.TheWANShow.video.saveSeperately
			}
			if (settings.TheWANShow.combineAndSaveAudioVideo != null) newSettings.TheWANShow.combineAndSaveAudioVideo = settings.TheWANShow.combineAndSaveAudioVideo
			if (settings.TheWANShow.downloadThreads != null) newSettings.TheWANShow.downloadThreads = settings.TheWANShow.downloadThreads
			if (settings.TheWANShow.downloadArtwork != null) newSettings.TheWANShow.downloadArtwork = settings.TheWANShow.downloadArtwork
		}


		if (settings.subscriptions != null) newSettings.subscriptions = settings.subscriptions


		if (settings.autoFetchServer != null) newSettings.autoFetchServer = settings.autoFetchServer
		if (settings.floatplaneServer != null) newSettings.floatplaneServer = settings.floatplaneServer
		if (settings.video_res != null) newSettings.video_res = settings.video_res

		if (settings.logging != null) newSettings.logging = settings.logging
		if (settings.logFile != null) newSettings.logFile = settings.logFile

		if (settings.plexSection != null) newSettings.plexSection = settings.plexSection

		if (settings.remotePlexUpdates != null) {
			if (settings.remotePlexUpdates.enabled != null) newSettings.remotePlexUpdates.enabled = settings.remotePlexUpdates.enabled
			if (settings.remotePlexUpdates.serverIPAddr != null) newSettings.remotePlexUpdates.serverIPAddr = settings.remotePlexUpdates.serverIPAddr
			if (settings.remotePlexUpdates.serverPort != null) newSettings.remotePlexUpdates.serverPort = settings.remotePlexUpdates.serverPort
			if (settings.remotePlexUpdates.plexToken != null) newSettings.remotePlexUpdates.plexToken = settings.remotePlexUpdates.plexToken
		} else { // Support for pre 4.6.0 settings rewrite
			if (settings.remotePlex != null) newSettings.remotePlexUpdates.enabled = settings.remotePlex
			if (settings.remotePlexIP != null) newSettings.remotePlexUpdates.serverIPAddr = settings.remotePlexIP
			if (settings.remotePlexPort != null) newSettings.remotePlexUpdates.serverPort = settings.remotePlexPort
			if (settings.plexToken != null) newSettings.remotePlexUpdates.plexToken = settings.plexToken
		}

		if (settings.localPlexUpdates != null) {
			if (settings.localPlexUpdates.enabled != null) newSettings.localPlexUpdates.enabled = settings.localPlexUpdates.enabled
			if (settings.localPlexUpdates.plexScannerInstall != null) newSettings.localPlexUpdates.plexScannerInstall = settings.localPlexUpdates.plexScannerInstall
		} else {  // Support for pre 4.6.0 settings rewrite
			if (settings.localPlex != null) newSettings.localPlexUpdates.enabled = settings.localPlex
			if (settings.plexScannerInstall != null) newSettings.localPlexUpdates.plexScannerInstall = settings.plexScannerInstall
		}

		if (settings.user != null) newSettings.user = settings.user
		if (settings.password != null) newSettings.password = settings.password
		if (settings.cookie != null) newSettings.cookie = settings.cookie
		if (settings.cookies != null) newSettings.cookies = settings.cookies

		fs.writeFile("./update/settings.json", JSON.stringify(newSettings, null, 2), 'utf8').then(() => {
			resolve()
		)
	)


function moveFiles(){
	return new Promise((resolve, reject) => {
		fs.readdirSync('./update').forEach(function(file, index){
		    fs.renameSync('./update/'+file, file);
		);
	)


function deleteFiles(path){
	return new Promise((resolve, reject) => {
		setTimeout(function(){
			fs.remove('./update', err => {
				if (err) return console.error(err)
				resolve()
			)
		, 2000)
	)
