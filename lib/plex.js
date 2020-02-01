const settings = require('./settings.js')

const request = require('./request.js');
const prompt = require('prompt');

const getPlexToken = async () => { // If remoteplex is enabled then this asks the user for the plex username and password to generate a plexToken for remote refreshes
	console.log('> Remote plex enabled! Fetching library access token...');
	console.log('> Please enter your plex login details:');
	prompt.start();
	await new Promise(async (resolve, reject) => prompt.get(
		[{
			name: "Email/Username", 
			required: true
		}, {
			name: "Password", 
			required: true, 
			hidden: true, 
			replace: '*'
		}], async (err, result) => {
			if (err) reject(err)
			if (!result) process.exit(1)
			console.log('');
			const body = await request.post({ // Sends a post request to plex to generate the plexToken
				url: `https://plex.tv/users/sign_in.json?user%5Blogin%5D=${result['Email/Username']}&user%5Bpassword%5D=${result.Password}`,
				headers: {
					'X-Plex-Client-Identifier': "FDS",
					'X-Plex-Product': "Floatplane Download Script",
					'X-Plex-Version': "1"
				}
			})
			console.log('\u001b[36mFetched!\u001b[0m\n');
			settings.remotePlexUpdates.plexToken = JSON.parse(body).user.authToken
			resolve()
		})
	)
}


const getLocalPlexDetails = async () => { // If remotePlex or localPlex is enabled and the section is the default "0" then ask the user for their section ID
	console.log('> Plex updates enabled! Please enter your plex section details, leave empty for defaults:');
	console.log('> Go to https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/settings.md for more info')
	prompt.start(); // This can either be the ID number or the url that links to the section in plex
	await new Promise((resolve, reject) => prompt.get(
		[{
			name: "Floatplane Plex URL or Section ID", 
			required: true
		}], (err, result) => {
			if (err) reject(err)
			if (!result) process.exit(1)
			console.log('')
			settings.plexSection = result['Floatplane Plex URL or Section ID'].split('%2F').reverse()[0]
			resolve()
		})
	);
}

const getRemotePlexDetails = async () => { // If remotePlex is enabled then this will ask the user for their plex server's IP and port numbers
	console.log("> Please enter your remote plex server's ip address and port:");
	console.log("> Leave port empty to use default")
	prompt.start();
	await new Promise((resolve, reject) => prompt.get(
		[{
			name: "IP", 
			required: true
		}, {
			name: "Port", 
			required: false
		}], (err, result) => {
			if (err) reject(err)
			if (!result) process.exit(1)
			settings.remotePlexUpdates.serverIPAddr = result.IP

			if (result.Port == "") settings.remotePlexUpdates.serverPort = 32400
			else settings.remotePlexUpdates.serverPort = result.port
			console.log('');
			resolve()
		})
	)
}

const init = async () => {
	if (settings.remotePlexUpdates.enabled) {
		if (settings.remotePlexUpdates.plexToken == "") await getPlexToken()
		else console.log("> Using saved plex token")
	}
	if (settings.remotePlexUpdates.enabled && settings.remotePlexUpdates.serverIPAddr == "") await getRemotePlexDetails()
	if ((settings.remotePlexUpdates.enabled || settings.localPlexUpdates.enabled) && settings.plexSection == 0) await getLocalPlexDetails()
	
}

module.exports = { init }