import prompts from "prompts";

/**
 * Prompts if user wants to encrypt their authentication details.
 * @param {boolean} initial Default value
 * @returns {Promise<boolean>} True of False
 */
export const encryptAuthDB = async (initial: boolean=true): Promise<boolean> => (await prompts({
	type: "toggle",
	name: "crypt",
	message: "Encrypt authentication database (recommended)?",
	initial,
	active: "Yes",
	inactive: "No"
})).crypt;

/**
 * Prompts if user wants to have auto repeating enabled.
 * @param {boolean} initial Default value
 * @returns {Promise<boolean>} True of False
 */
export const repeat = async (initial: boolean): Promise<boolean> => (await prompts({
	type: "toggle",
	name: "crypt",
	message: "Auto repeat video fetching?",
	initial,
	active: "Yes",
	inactive: "No"
})).repeat;

/**
 * Prompts user to set the interval to auto repeat
 * @param {string} initial Default value (HH:mm:ss)
 * @returns {Promise<string>} HH:mm:ss
 */
export const repeatInterval = async (initial: string): Promise<string> => {
	const repeatInterval = (await prompts({ 
		type: "date",
		name: "repeatInterval",
		message: "Please set the interval to repeat video fetching. HH:mm:ss",
		mask: "HH:mm:ss",
		initial: new Date(`1999 ${initial}`)
	})).repeatInterval;
	return `${repeatInterval.getHours()}:${repeatInterval.getMinutes()}:${repeatInterval.getSeconds()}`;
};

/**
 * Prompts user for the folder to save videos.
 * @param {boolean} initial Default value
 * @returns {Promise<string>} Folder path to save videos
 */
export const videoFolder = async (initial: boolean): Promise<string> => (await prompts({
	type: "text",
	name: "videoFolder",
	message: "What folder do you want to save videos?",
	initial
})).videoFolder;

/**
 * Prompts user to set the max number of parallel downloads.
 * @param {number} initial Default value
 * @returns {Promise<number>} Max number of parallel downloads
 */
export const downloadThreads = async (initial: number): Promise<number> => (await prompts({
	type: "number",
	name: "downloadThreads",
	message: "What is the number of threads to use for downloads? -1 for unlimited.",
	initial,
	min: -1
})).downloadThreads;

/**
 * Prompts user for the video resolution they want to download in.
 * @param {number} initial Initial resolution to be selected
 * @param {Array<number>} resolutions Avalible resolutions
 * @returns {Promise<number>} Resolution to use
 */
export const videoResolution = async (initial: number, resolutions: Array<number>): Promise<number> => (await prompts({
	type: "select",
	name: "resolution",
	message: "What resolution would you like to download in?",
	choices: resolutions.map(res => ({ title: `${res}p`, value: res, disabled: false })),
	initial: resolutions.indexOf(initial)
})).resolution;

/**
 * Prompts user to specify the file formatting to use for saving videos. Options avalible for use are created from `options`
 * @param {string} initial Default value
 * @param {Array<string>} options File formatting options avalible
 * @returns {Promise<string>} File formatting to use
 */
export const fileFormatting = async (initial: string, options: Array<string>): Promise<string> => (await prompts({
	type: "text",
	name: "fileFormatting",
	message: "What format should be used for saving videos? The following values can be used:\n"+options.reduce((str, option) => `${str} - ${option}\n`, ""),
	initial
})).fileFormatting;

/**
 * Prompts user to set any extra boolean settings
 * @param options Object containing extra settings
 * @returns {Promise<Array<string>>} Keynames of enabled extras
 */
export const extras = async (options: { [key: string]: boolean; }): Promise<Array<string>> => (await prompts({
	type: "multiselect",
	name: "extras",
	message: "Enable/Disable Extra Options:",
	choices: Object.keys(options).map(option => ({ title: option, value: option, selected: options[option] })),
	hint: "- Space to select. Return to submit"
})).extras;

/**
 * Proompts user if they want to find the closest download server automatically in the future.
 * @param {boolean} initial Default value
 * @returns {Promise<boolean>} True or False
 */
export const autoFindClosestServer = async (initial: boolean): Promise<boolean> => (await prompts({
	type: "toggle",
	name: "bestEdge",
	message: "Automatically find the best server in the future?",
	initial,
	active: "Yes",
	inactive: "No"
})).bestEdge;