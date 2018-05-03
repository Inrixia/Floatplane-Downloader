const request = require('request')
const fs = require('fs-extra')
const AdmZip = require('adm-zip')

getUpdate().then(updateSettings).then(moveFiles).then(deleteFiles)

var useBeta = false

function getUpdate() {
	return new Promise((resolve, reject) => {
		request.get({
			url: 'https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/latest.json',
		}, function (err, resp, body) {
			updateInfo = JSON.parse(body)
			if (useBeta) {
				updateInfo.version = updateInfo.beta
			}
			console.log('Now updating to version '+updateInfo.version+'\n\n')
			request('https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/releases/'+updateInfo.version+'.zip').on('error', function (err) {
				console.log(err);
			}).pipe(fs.createWriteStream("./update.zip")).on('finish', function(){
				zip = AdmZip("./update.zip")
				zip.getEntries().forEach(function(zipEntry) {
					if(zipEntry.entryName.indexOf('videos') == -1) {
					    zip.extractEntryTo(zipEntry.entryName, './update', false, true)
					}
				});
				fs.unlink("./update.zip")
				resolve()
			});
		});
	})
}


function updateSettings(){
	return new Promise((resolve, reject) => {
		var newSettings = JSON.parse(fs.readFileSync('./update/settings.json', 'utf8'));
		var settings = JSON.parse(fs.readFileSync('./settings.json', 'utf8'));
		if(settings.videoFolder != null) {newSettings.videoFolder = settings.videoFolder}
		if(settings.useFloatplane != null) {newSettings.useFloatplane = settings.useFloatplane}
		if(settings.useBitWit != null) {newSettings.useBitWit = settings.useBitWit}
		if(settings.maxVideos != null) {newSettings.maxVideos = settings.maxVideos}
		if(settings.maxPages != null) {newSettings.maxPages = settings.maxPages}
		if(settings.maxParallelDownloads != null) {newSettings.maxParallelDownloads = settings.maxParallelDownloads}
		if(settings.downloadArtwork != null) {newSettings.downloadArtwork = settings.downloadArtwork}
		if(settings.forceLogin != null) {newSettings.forceLogin = settings.forceLogin}
		if(settings.formatWithEpisodes != null) {newSettings.formatWithEpisodes = settings.formatWithEpisodes}
		if(settings.downloadUpdateTime != null) {newSettings.downloadUpdateTime = settings.downloadUpdateTime}
		if(settings.ignoreFolderStructure != null) {newSettings.ignoreFolderStructure = settings.ignoreFolderStructure}
		if(settings.video_res != null) {newSettings.video_res = settings.video_res}
		if(settings.user != null) {newSettings.user = settings.user}
		if(settings.password != null) {newSettings.password = settings.password}
		if(settings.floatplaneServer != null) {newSettings.floatplaneServer = settings.floatplaneServer}
		if(settings.formatWithDate != null) {newSettings.formatWithDate = settings.formatWithDate}
		if(settings.repeatScript != null) {newSettings.repeatScript = settings.repeatScript}
		if(settings.yearsAsSeasons != null) {newSettings.yearsAsSeasons = settings.yearsAsSeasons}
		if(settings.monthsAsSeasons != null) {newSettings.monthsAsSeasons = settings.monthsAsSeasons}
		if(settings.plexScannerInstall != null) {newSettings.plexScannerInstall = settings.plexScannerInstall}
		if(settings.plexSection != null) {newSettings.plexSection = settings.plexSection}
		if(settings["Floatplane Exclusive"] != null) {newSettings["Floatplane Exclusive"] = settings["Floatplane Exclusive"]}
		if(settings["Linus Tech Tips"] != null) {newSettings["Linus Tech Tips"] = settings["Linus Tech Tips"]}
		if(settings["Techquickie"] != null) {newSettings["Techquickie"] = settings["Techquickie"]}
		if(settings["Channel Super Fun"] != null) {newSettings["Channel Super Fun"] = settings["Channel Super Fun"]}
		if(settings.remotePlex != null) {newSettings.remotePlex = settings.remotePlex}
		if(settings.remotePlexIP != null) {newSettings.remotePlexIP = settings.remotePlexIP}
		if(settings.remotePlexPort != null) {newSettings.remotePlexPort = settings.remotePlexPort}
		if(settings.plexToken != null) {newSettings.plexToken = settings.plexToken}
		if(settings.localPlex != null) {newSettings.localPlex = settings.localPlex}
		fs.writeFile("./update/settings.json", JSON.stringify(newSettings, null, 2), 'utf8').then(() => {
			resolve()
		})
	})
}

function moveFiles(){
	return new Promise((resolve, reject) => {
		fs.readdirSync('./update').forEach(function(file, index){
		    fs.renameSync('./update/'+file, file);
		});
	})
}

function deleteFiles(path){
	return new Promise((resolve, reject) => {
		setTimeout(function(){
			fs.remove('./update', err => {
				if (err) return console.error(err)
				resolve()
			})
		}, 2000)
	})
}
