const prompts = require('prompts');
const { requiredPrompts } = require('./helpers.js')

/**
 * Prompts user if they want to automatically refresh plex libraries.
 * @param {boolean} initial Default value
 * @returns {Promise<boolean>} True or False
 */
module.exports.usePlex = async initial => (await prompts({
	type: 'toggle',
	name: 'usePlex',
	message: 'Do you want to automatically refresh plex libraries?',
	initial,
	active: 'Yes',
	inactive: 'No'
})).usePlex

/**
 * Prompts the user for the plex sections they want to automatically refresh
 * @param {string} initial Default values (10, 11, 12)
 * @returns {Promise<Array<string>>} Sections to refresh
 */
module.exports.sections = async initial => (await requiredPrompts({
	type: 'list',
	name: 'sections',
	message: "Please enter the plex section id's you want to refresh.",
	initial
})).sections

/**
 * Prompts the user for their plex username.
 * @param {string} initial 
 * @returns {Promise<string>}
 */
module.exports.username = async initial => (await prompts({
	type: 'text',
	name: 'username',
	message: 'Plex account email/username:',
	initial
})).username

/**
 * Prompts the user for their plex password.
 * @param {string} initial 
 * @returns {Promise<string>}
 */
module.exports.password = async initial => (await prompts({
	type: 'password',
	name: 'password',
	message: 'Plex account password:',
	initial
})).password

/**
 * Prompts the user for their plex server hosname.
 * @param {string} initial
 * @returns {Promise<string>}
 */
module.exports.hostname = async initial => (await prompts({
	type: 'text',
	name: 'hostname',
	message: "Plex server IP/Hostname:",
	initial
})).ip

/**
 * Prompts the user for their plex server port.
 * @param {number} initial 
 * @returns {Promise<number>}
 */
module.exports.port = async initial => (await prompts({
	type: 'text',
	name: 'port',
	message: "Plex server port:",
	initial
})).port