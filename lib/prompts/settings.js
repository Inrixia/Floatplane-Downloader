const prompts = require('prompts');

/**
 * Prompts if the user wants to encrypt their authentication details.
 * @param {bool} initial Default value
 * @returns {Promise<bool>} True of False
 */
module.exports.encryptAuthDB = async (initial=true) => (await prompts({
	type: 'toggle',
	name: 'crypt',
	message: 'Encrypt authentication database (recommended)?',
	initial,
	active: 'Yes',
	inactive: 'No'
})).crypt

/**
 * Prompts if the user wants to have auto repeating enabled.
 * @param {boolean} initial Default value
 * @returns {Promise<bool>} True of False
 */
module.exports.repeat = async initial => (await prompts({
	type: 'toggle',
	name: 'crypt',
	message: 'Auto repeat video fetching?',
	initial,
	active: 'Yes',
	inactive: 'No'
})).repeat

/**
 * Prompts the user to set the interval to auto repeat
 * @param {string} initial Default value (HH:mm:ss)
 * @returns {Promise<string>} HH:mm:ss
 */
module.exports.repeatInterval = async initial => {
	const repeatInterval = (await prompts({ 
		type: 'date',
		name: 'repeatInterval',
		message: 'Please set the interval to repeat video fetching. HH:mm:ss',
		mask: "HH:mm:ss",
		initial: new Date(`1999 ${initial}`)
	})).repeatInterval
	return `${repeatInterval.getHours()}:${repeatInterval.getMinutes()}:${repeatInterval.getSeconds()}`
}

/**
 * Prompts the user for the folder to save videos.
 * @param {bool} initial Default value
 * @returns {Promise<string>} Folder path to save videos
 */
module.exports.videoFolder = async (initial) => (await prompts({
	type: 'text',
	name: 'videoFolder',
	message: 'What folder do you want to save videos?',
	initial
})).videoFolder

/**
 * Prompts user to set the max number of parallel downloads.
 * @param {number} initial Default value
 * @returns {Promise<number>} Max number of parallel downloads
 */
module.exports.downloadThreads = async (initial) => (await prompts({
	type: 'number',
	name: 'downloadThreads',
	message: 'What is the number of threads to use for downloads? -1 for unlimited.',
	initial,
	min: -1
})).downloadThreads

/**
 * Prompts the user for the video resolution they want to download in.
 * @param {number} initial Initial resolution to be selected
 * @param {Array<number>} resolutions Avalible resolutions
 * @returns {Promise<number>} Resolution to use
 */
module.exports.videoResolution = async (initial, resolutions) => (await prompts({
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
 * @returns {Promise<string>} File formatting to use
 */
module.exports.fileFormatting = async (initial, options) => (await prompts({
	type: 'text',
	name: 'fileFormatting',
	message: "What format should be used for saving videos? The following values can be used:\n"+options.reduce((str, option) => `${str} - ${option}\n`, ''),
	initial
})).fileFormatting

/**
 * Prompts the user to set any extra boolean settings
 * @param {{optionName: bool}} options Object containing extra settings
 * @returns {Promise<Array<string>>} Keynames of enabled extras
 */
module.exports.extras = async options => (await prompts({
	type: 'multiselect',
	name: 'extras',
	message: 'Enable/Disable Extra Options:',
	choices: Object.keys(options).map(option => ({ title: option, value: option, selected: options[option] })),
	hint: '- Space to select. Return to submit'
})).extras

/**
 * Proompts the user if they want to find the closest download server automatically in the future.
 * @param {bool} initial Default value
 * @returns {Promise<bool>} True or False
 */
module.exports.autoFindClosestServer = async initial => (await prompts({
	type: 'toggle',
	name: 'bestEdge',
	message: 'Automatically find the best server in the future?',
	initial,
	active: 'Yes',
	inactive: 'No'
})).bestEdge