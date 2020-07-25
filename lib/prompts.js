const prompts = require('prompts');

/**
 * Prompts a user for input, onCancel tries again `maxDepth` times.
 * @param {object} question Question to ask
 * @param {Number} maxDepth Maximum times to ask the question 
 * @param {string} cancelPrompt String to sent to stdout when the user cancels (omitted on last cancel).
 */
const requiredPrompts = (question, maxDepth=2, cancelPrompt=`\nAnswering this question is required to continue.\n`, depth=0) => {
	if (depth > 0 && depth < maxDepth) process.stdout.write(cancelPrompt)
	if (depth >= maxDepth) process.exit(1)
	const onCancel = () => new Promise(async (resolve, reject) => resolve(await requiredPrompts(question, maxDepth, cancelPrompt, depth+=1)))
	return prompts(question, { onCancel })
}

/**
 * Prompts user for credentials if none are saved.
 */
const plexSection = () => new Promise((resolve, reject) => {
	console.log('> Please enter the ID or URL for the section(s) you wish to refresh:');
	console.log('Examples:')
	console.log('	"10, 12, 16" for multiple sections.')
	console.log('	"10" for a single section.')
	console.log('	"https://app.plex.tv/desktop#!/media/2g35g/com.plexapp.plugins.library?key=%2Fgsdr%2Fsections%2F4" for a single section using URL.')
	const PromptOptions = [{
		name: "Plex Section(s) ID or URL",
		required: true
	}]
	prompt.start();
	prompt.get(PromptOptions, (err, result) => {
		if (err) reject(err)
		if (!result) reject("You must enter Plex Section(s) ID or URL!")
		resolve(result['Plex Section(s) ID or URL'].replace(/ /g, '').split(','))
	})
})

/**
 * Prompts user for credentials if none are saved.
 */
const remotePlexDetails = () => {
	console.log('> Please enter your plex details:');
	return prompts([{
		type: 'text',
		name: 'username',
		message: 'Plex account email/username:'
	}, {
		type: 'password',
		name: 'password',
		message: 'Plex account password:'
	}, {
		type: 'text',
		name: 'ip',
		message: "Plex server ip:"
		
	}, {
		type: 'text',
		name: 'port',
		message: "Plex server port:"
	}])
}

/**
 * Prompts user for floatplane user/pass.
 * @returns {{ username:string, password:string }}
 */
const floatplaneCredentials = () => requiredPrompts([
	{
		type: 'text',
		name: 'username',
		message: 'Please enter your floatplane email/username'
	}, {
		type: 'password',
		name: 'password',
		message: 'Please enter your floatplane password'
	}
])

/**
 * Prompts user for floatplane token.
 * @returns {{ token:string }}
 */
const floatplaneToken = async () => (await requiredPrompts({
	type: 'text',
	name: 'token',
	message: "Please enter your floatplane 2Factor authentication token"
})).token

/**
 * Prompts if the user wants to save their login details.
 * @returns {bool} True or False
 */
const saveLoginDetails = async () => (await prompts({
	type: 'toggle',
	name: 'save',
	message: 'Save your login details?',
	initial: false,
	active: 'Yes',
	inactive: 'No'
})).save

const encryptAuthDB = async () => (await prompts({
	type: 'toggle',
	name: 'crypt',
	message: 'Encrypt authentication database (recommended)?',
	initial: true,
	active: 'Yes',
	inactive: 'No'
})).crypt

const videoFolder = async () => (await prompts({
	type: 'text',
	name: 'videoFolder',
	message: 'What folder do you want to save videos?',
	initial: settings.videoFolder
})).videoFolder

const maxVideos = async () => (await prompts({
	type: 'number',
	name: 'maxVideos',
	message: 'How many videos do you want to search through for ones to download?',
	initial: settings.maxVideos,
	min: 0
})).maxVideos

const maxParallelDownloads = async () => (await prompts({
	type: 'number',
	name: 'maxParallelDownloads',
	message: 'What is the maximum number of parallel downloads you want to have running?',
	initial: settings.maxParallelDownloads,
	min: -1
})).maxParallelDownloads

const findBestServer = async () => (await prompts({
	type: 'toggle',
	name: 'findBestServer',
	message: 'Would you like to try find the best download server?',
	initial: true,
	active: 'Yes',
	inactive: 'No'
})).findBestServer

const autoFindBestServer = async () => (await prompts({
	type: 'toggle',
	name: 'bestEdge',
	message: 'Automatically check for the best server in the future?',
	initial: true,
	active: 'Yes',
	inactive: 'No'
})).bestEdge

module.exports = { 
	plexSection, 
	remotePlexDetails, 
	floatplaneCredentials, 
	floatplaneToken, 
	saveLoginDetails, 
	encryptAuthDB,
	videoFolder,
	maxVideos,
	maxParallelDownloads,
	findBestServer,
	autoFindBestServer
}