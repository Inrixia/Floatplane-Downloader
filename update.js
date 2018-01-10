const request = require('request')
const prompt = require('prompt')
const fs = require('fs')
const AdmZip = require('adm-zip')
const settings = require('./settings.json')

getUpdate().then(updateSettings).then(moveFiles).then(deleteFiles)

function getUpdate() {
	return new Promise((resolve, reject) => {
		request.get({
			url: 'https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/latest.json',
		}, function (err, resp, body) {
			updateInfo = JSON.parse(body)
			console.log('Now updating to version '+updateInfo.version+'\n\n')
			request('https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/releases/'+updateInfo.version+'.zip').on('error', function (err) {
				console.log(err);
			}).pipe(fs.createWriteStream("./update.zip")).on('finish', function(){
				AdmZip("./update.zip").extractAllTo("./update");
				fs.unlink("./update.zip")
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
		fs.writeFile("./update/settings.json", JSON.stringify(newSettings, null, 2), 'utf8')
		resolve()
	})
}

function moveFiles(){
	return new Promise((resolve, reject) => {
		fs.readdirSync('./update').forEach(function(file, index){
		    fs.renameSync('./update/'+file, file);
		});
		resolve()
	})
}

function deleteFiles(){
	return new Promise((resolve, reject) => {
		fs.readdirSync('./update').forEach(function(file, index){
	      var curPath = './update' + "/" + file;
	      if (fs.lstatSync(curPath).isDirectory()) {
	        deleteFolderRecursive(curPath);
	      } else {
	        fs.unlinkSync(curPath);
	      }
		});
	    fs.rmdirSync('./update');
	    resolve()
	})
}