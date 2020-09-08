const prompts = require('prompts');

/**
 * Prompts if user wants to save their login details.
 * @param {bool} initial Default value
 * @returns {Promise<bool>} True or False
 */
module.exports.saveLoginDetails = async (initial=false) => (await prompts({
	type: 'toggle',
	name: 'save',
	message: 'Save your login details?',
	initial,
	active: 'Yes',
	inactive: 'No'
})).save

/**
 * Prompts user if they want to find the closest download server now.
 * @param {bool} initial Default value
 * @returns {Promise<bool>} True or False
 */
module.exports.findClosestServerNow = async (initial=true) => (await prompts({
	type: 'toggle',
	name: 'findBestServer',
	message: 'Would you like to try find the best download server?',
	initial,
	active: 'Yes',
	inactive: 'No'
})).findBestServer