import prompts from "prompts";
import { type Channels } from "../types";

/**
 * Prompts user to set videos to search through for downloads.
 * @param {number} initial Default value
 * @returns {Promise<number>} Videos to search through.
 */
export const videosToSearch = async (initial: number): Promise<number> =>
	(
		await prompts({
			type: "number",
			name: "videosToSearch",
			message: "How many videos back from the latest do you want to search through for ones to download?",
			initial,
			min: 0,
		})
	).videosToSearch || initial;

export const channels = async (initial: Channels): Promise<string[]> => {
	return (
		await prompts({
			type: "multiselect",
			name: "downloadChannels",
			message: "Enable/Disable channels:",
			choices: initial.map((initial) => ({ title: initial.title, value: initial.title, selected: !initial.skip })),
			hint: "- Space to select. Return to submit",
		})
	).downloadChannels;
};
