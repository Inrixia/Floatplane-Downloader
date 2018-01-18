const request = require('request')
const fs = require('fs-extra')
const AdmZip = require('adm-zip')
const settings = require('./settings.json')

getUpdate().then(updateSettings).then(moveFiles).then(deleteFiles)

function getUpdate() {
	return new Promise((resolve, reject) => {
		request.get({
			url: 'https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/latest.json',
		}, function (err, resp, body) {
			updateInfo = JSON.parse(body)
			console.log('Now updating to version '+updateInfo.beta+'\n\n')
			request('https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/releases/'+updateInfo.beta+'.zip').on('error', function (err) {
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
		newSettings.user = settings.user
		newSettings.password = settings.password
		newSettings.useBitWit = settings.useBitWit
		newSettings.useFloatplane = settings.useFloatplane
		newSettings.videoFolder = settings.videoFolder
		newSettings.forceLogin = settings.forceLogin
		newSettings.video_res = settings.video_res
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