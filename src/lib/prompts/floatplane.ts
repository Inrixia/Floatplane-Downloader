import { requiredPrompts } from './helpers.js';
import prompts from 'prompts';

/**
 * Prompts user for floatplane username
 * @returns {Promise<string>} Username
 */
export const username = async (): Promise<string> =>
	(
		await requiredPrompts({
			type: 'text',
			name: 'username',
			message: 'Please enter your floatplane email/username',
		})
	).username;

/**
 * Prompts user for floatplane password
 * @returns {Promise<string>} Password
 */
export const password = async (): Promise<string> =>
	(
		await requiredPrompts({
			type: 'password',
			name: 'password',
			message: 'Please enter your floatplane password',
		})
	).password;

/**
 * Prompts user to set videos to search through for downloads.
 * @param {number} initial Default value
 * @returns {Promise<number>} Videos to search through.
 */
export const videosToSearch = async (initial: number): Promise<number> =>
	(
		await prompts({
			type: 'number',
			name: 'videosToSearch',
			message: 'How many videos back from the latest do you want to search through for ones to download?',
			initial,
			min: 0,
		})
	).videosToSearch || initial;

/**
 * Prompts user for floatplane token.
 * @returns {Promise<string>} Floatplane OAuth Token
 */
export const token = async (): Promise<string> =>
	(
		await requiredPrompts({
			type: 'text',
			name: 'token',
			message: 'Please enter your floatplane 2Factor authentication token',
		})
	).token;
