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
 * @returns {{ username: string, password: string, ip: string, port: string }} Plex Username, Password, IP and Port
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
 * @returns {{ username:string, password:string }} Floatplane Username & Password
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
 * @returns {string} Floatplane OAuth Token
 */
const floatplaneToken = async () => (await requiredPrompts({
	type: 'text',
	name: 'token',
	message: "Please enter your floatplane 2Factor authentication token"
})).token

/**
 * Prompts if the user wants to save their login details.
 * @param {bool} initial Default value
 * @returns {bool} True or False
 */
const saveLoginDetails = async (initial=false) => (await prompts({
	type: 'toggle',
	name: 'save',
	message: 'Save your login details?',
	initial,
	active: 'Yes',
	inactive: 'No'
})).save

/**
 * Prompts if the user wants to encrypt their authentication details.
 * @param {bool} initial Default value
 * @returns {bool} True of False
 */
const encryptAuthDB = async (initial=true) => (await prompts({
	type: 'toggle',
	name: 'crypt',
	message: 'Encrypt authentication database (recommended)?',
	initial,
	active: 'Yes',
	inactive: 'No'
})).crypt

/**
 * Prompts the user for the folder to save videos.
 * @param {bool} initial Default value
 * @returns {string} Folder path to save videos
 */
const videoFolder = async (initial) => (await prompts({
	type: 'text',
	name: 'videoFolder',
	message: 'What folder do you want to save videos?',
	initial
})).videoFolder

/**
 * Prompts the user to set videos to search through for downloads.
 * @param {number} initial Default value
 * @returns {number} Videos to search through.
 */
const maxVideos = async (initial) => (await prompts({
	type: 'number',
	name: 'maxVideos',
	message: 'How many videos do you want to search through for ones to download?',
	initial,
	min: 0
})).maxVideos

/**
 * Prompts user to set the max number of parallel downloads.
 * @param {number} initial Default value
 * @returns {number} Max number of parallel downloads
 */
const maxParallelDownloads = async (initial) => (await prompts({
	type: 'number',
	name: 'maxParallelDownloads',
	message: 'What is the maximum number of parallel downloads you want to have running?',
	initial,
	min: -1
})).maxParallelDownloads

/**
 * Prompts user if they want to find the closest download server now.
 * @param {bool} initial Default value
 * @returns {bool} True or False
 */
const findClosestServerNow = async (initial=true) => (await prompts({
	type: 'toggle',
	name: 'findBestServer',
	message: 'Would you like to try find the best download server?',
	initial,
	active: 'Yes',
	inactive: 'No'
})).findBestServer

/**
 * Proompts the user if they want to find the closest download server automatically in the future.
 * @param {bool} initial Default value
 * @returns {bool} True or False
 */
const autoFindClosestServer = async initial => (await prompts({
	type: 'toggle',
	name: 'bestEdge',
	message: 'Automatically find the best server in the future?',
	initial,
	active: 'Yes',
	inactive: 'No'
})).bestEdge

/**
 * Prompts the user for the video resolution they want to download in.
 * @param {number} initial Initial resolution to be selected
 * @param {Array<number>} resolutions Avalible resolutions
 * @returns {number} Resolution to use
 */
const videoResolution = async (initial, resolutions) => (await prompts({
	type: 'select',
	name: 'resolution',
	message: 'What resolution would you like to download in?',
	choices: resolutions.map(res => ({ title: `${res}p`, value: res, disabled: false })),
	initial: resolutions.indexOf(initial)
})).resolution

/**
 * Prompts user to specify the file formatting to use for saving videos. Options avalible for use are created from `options`
 * @param {string} initial Default value
 * @param {Array<string>} options File formatting options avalible
 * @returns {string} File formatting to use
 */
const fileFormatting = async (initial, options) => (await prompts({
	type: 'text',
	name: 'fileFormatting',
	message: "What format should be used for saving videos? The following values can be used:\n"+options.reduce((str, option) => `${str} - ${option}\n`, ''),
	initial
})).fileFormatting

/**
 * Prompts the user to set any extra boolean settings
 * @param {{optionName: bool}} options Object containing extra settings
 * @returns {Array<string>} Keynames of enabled extras
 */
const extras = async options => (await prompts({
	type: 'multiselect',
	name: 'extras',
	message: 'Enable/Disable Extra Options:',
	choices: Object.keys(options).map(option => ({ title: option, value: option, selected: options[option] })),
	hint: '- Space to select. Return to submit'
})).extras

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
	findClosestServerNow,
	autoFindClosestServer,
	videoResolution,
	fileFormatting,
	extras
}