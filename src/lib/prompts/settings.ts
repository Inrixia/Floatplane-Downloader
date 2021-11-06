import prompts from 'prompts';
import type { Extras, Resolution } from '../types';

/**
 * Prompts user to set the max number of parallel downloads.
 * @param {number} initial Default value
 * @returns {Promise<number>} Max number of parallel downloads
 */
export const downloadThreads = async (initial: number): Promise<number> =>
	(
		await prompts({
			type: 'number',
			name: 'downloadThreads',
			message: 'What is the number of threads to use for downloads? (-1 for unlimited).',
			initial,
			min: -1,
		})
	).downloadThreads || initial;

/**
 * Prompts user for the video resolution they want to download in.
 * @param {number} initial Initial resolution to be selected
 * @param {Array<number>} resolutions Available resolutions
 * @returns {Promise<number>} Resolution to use
 */
export const videoResolution = async (initial: Resolution, resolutions: Array<Resolution>): Promise<Resolution> =>
	(
		await prompts({
			type: 'select',
			name: 'resolution',
			message: 'What resolution would you like to download in?',
			choices: resolutions.map((res) => ({ title: `${res}p`, value: res, disabled: false })),
			initial: resolutions.indexOf(initial),
		})
	).resolution || initial;

/**
 * Prompts user to specify the file formatting to use for saving videos. Options available for use are created from `options`
 * @param {string} initial Default value
 * @param {Array<string>} options File formatting options available
 * @returns {Promise<string>} File formatting to use
 */
export const fileFormatting = async (initial: string, options: Array<string>): Promise<string> =>
	(
		await prompts({
			type: 'text',
			name: 'fileFormatting',
			message: 'What format should be used for saving videos? The following values can be used:\n' + options.reduce((str, option) => `${str} - ${option}\n`, ''),
			initial,
		})
	).fileFormatting || initial;

/**
 * Prompts user to set any extra boolean settings
 * @param options Object containing extra settings
 * @returns {Promise<Array<string>>} Keynames of enabled extras
 */
export const extras = async (initial: Extras): Promise<Array<string> | undefined> =>
	(
		await prompts({
			type: 'multiselect',
			name: 'extras',
			message: 'Enable/Disable Extra Options:',
			choices: (Object.keys(initial) as [keyof Extras]).map((option) => ({ title: option, value: option, selected: initial[option] })),
			hint: '- Space to select. Return to submit',
		})
	).extras;
