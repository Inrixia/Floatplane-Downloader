const { requiredPrompts } = require('./helpers.js')
const prompts = require('prompts')

/**
 * Prompts user for floatplane user/pass.
 * @returns {Promise<{ username:string, password:string }>} Floatplane Username & Password
 */
module.exports.credentials = () => requiredPrompts([{
	type: 'text',
	name: 'username',
	message: 'Please enter your floatplane email/username'
}, {
	type: 'password',
	name: 'password',
	message: 'Please enter your floatplane password'
}])

/**
 * Prompts the user to set videos to search through for downloads.
 * @param {number} initial Default value
 * @returns {Promise<number>} Videos to search through.
 */
module.exports.videosToSearch = async initial => (await prompts({
	type: 'number',
	name: 'videosToSearch',
	message: 'How many videos do you want to search through for ones to download?',
	initial,
	min: 0
})).videosToSearch

/**
 * Prompts user for floatplane token.
 * @returns {Promise<string>} Floatplane OAuth Token
 */
module.exports.token = async initial => (await requiredPrompts({
	type: 'text',
	name: 'token',
	message: "Please enter your floatplane 2Factor authentication token",
	initial
})).token