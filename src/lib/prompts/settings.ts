import prompts from "prompts";
import type { Extras, Resolution } from "../types.js";
import { Video } from "../Video.js";
import { settings, fApi } from "../helpers/index.js";

/**
 * Prompts user for the video resolution they want to download in.
 * @param {number} initial Initial resolution to be selected
 * @param {Array<number>} resolutions Available resolutions
 * @returns {Promise<number>} Resolution to use
 */
export const videoResolution = async (initial: Resolution, resolutions: Array<Resolution>): Promise<Resolution> =>
	(
		await prompts({
			type: "select",
			name: "resolution",
			message: "What resolution would you like to download in?",
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
export const fileFormatting = async (initial: string, options: typeof Video.FilePathOptions): Promise<string> =>
	(
		await prompts({
			type: "text",
			name: "fileFormatting",
			message: "What format should be used for saving videos? The following values can be used:\n" + options.reduce((str, option) => `${str} - ${option}\n`, ""),
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
			type: "multiselect",
			name: "extras",
			message: "Enable/Disable Extra Options:",
			choices: Object.keys(initial).map((option) => ({ title: option, value: option, selected: initial[option] })),
			hint: "- Space to select. Return to submit",
		})
	).extras;

/**
 * Prompts user if they want to automatically delete videos x days.
 */
export const deleteOldVideos = async (initial: boolean): Promise<boolean> =>
	(
		await prompts({
			type: "toggle",
			name: "deleteOldVideos",
			message: "Do you want to automatically delete videos after a specified number of days?",
			initial,
			active: "Yes",
			inactive: "No",
		})
	).deleteOldVideos;

/**
 * Prompts user for how many days to keep videos.
 */
export const daysToKeepVideos = async (initial: number): Promise<number> =>
	(
		await prompts({
			type: "number",
			name: "daysToKeepVideos",
			message: "How many days do you want to keep videos before they are deleted?",
			initial,
			min: 1,
		})
	).daysToKeepVideos || initial;
/**
 * Prompts user for enabling/disabling channels
 */
export const downloadChannel = async (): Promise<void> => {
	const userSubscription = await fApi.user.subscriptions();
	const channels = await fApi.creator.channels(userSubscription.map((channel) => channel.creator));

	const subscriptions = userSubscription.map((subscription) => ({
		title: subscription.plan.title,
		value: subscription.creator,
		channels: channels
			.filter((chan) => chan.creator === subscription.creator)
			.map((e) => ({
				id: e.id,
				title: e.title,
				skip: false,
				isChannel:
					e.id === "6413623f5b12cca228a28e78"
						? `(post, video) => isChannel(post, '${e.id}') && !video?.title?.toLowerCase().startsWith('caption')`
						: `(post) => isChannel(post, '${e.id}')`,
			})),
	}));

	let res: string | undefined = undefined;

	while (res !== "confirm") {
		res = (
			await prompts({
				type: "select",
				name: "subscriptionSelect",
				message: "Select a subscription",
				choices: [...subscriptions, { title: "Confirm", value: "confirm" }],
			})
		).subscriptionSelect;

		if (res) {
			const selected = subscriptions.find((subscription) => subscription.value === res);
			if (selected) {
				const result = await prompts({
					type: "multiselect",
					name: "downloadChannel",
					message: "Enable/Disable channels:",
					choices: selected.channels.map((e) => ({ title: e.title, value: e.id, selected: !e.skip })),
					hint: "- Space to select. Return to submit",
				});

				selected.channels = selected.channels.map((e) => ({ ...e, skip: !result.downloadChannel.includes(e.id) }));
			}
		}
	}

	for (const subscription of subscriptions) {
		settings.subscriptions[subscription.value] ??= {
			creatorId: subscription.value,
			plan: subscription.title,
			skip: false,
			channels: subscription.channels.map((channel) => ({ title: channel.title, skip: channel.skip, isChannel: channel.isChannel })),
		};
	}
};
