const { requiredPrompts } = require('./helpers.js')
const prompts = require('prompts')

/**
 * Prompts user for floatplane username
 * @returns {Promise<string>} Username
 */
module.exports.username = async () => (await requiredPrompts({
	type: 'text',
	name: 'username',
	message: 'Please enter your floatplane email/username'
})).username

/**
 * Prompts user for floatplane password
 * @returns {Promise<string>} Password
 */
module.exports.password = async () => (await requiredPrompts({
	type: 'password',
	name: 'password',
	message: 'Please enter your floatplane password'
})).password

/**
 * Prompts user to set videos to search through for downloads.
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