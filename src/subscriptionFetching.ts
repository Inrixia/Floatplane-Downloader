import { defaultSubChannels } from "./lib/defaults.js";
import Subscription from "./lib/Subscription.js";
import { settings, fApi } from "./lib/helpers/index.js";

export async function* fetchSubscriptions() {
	for (const userSubscription of await fApi.user.subscriptions()) {
		// Add the subscription to settings if it doesnt exist
		settings.subscriptions[userSubscription.creator] ??= {
			creatorId: userSubscription.creator,
			plan: userSubscription.plan.title,
			skip: false,
			channels: defaultSubChannels[userSubscription.creator] ?? [],
		};
		const settingSubscription = settings.subscriptions[userSubscription.creator];

		// Make sure that new subchannels from defaults are added to settings
		if (defaultSubChannels[userSubscription.creator] !== undefined) {
			const channelsToAdd = defaultSubChannels[userSubscription.creator].filter(
				(channel) => settingSubscription.channels.findIndex((chan) => chan.title === channel.title) === -1,
			);
			if (channelsToAdd.length > 0) settingSubscription.channels = [...settingSubscription.channels, ...channelsToAdd];
		}

		const subChannels = await fApi.creator.channels([userSubscription.creator]);
		for (const channel of subChannels) {
			const subChannel = settingSubscription.channels.find((chan) => chan.title === channel.title);
			const channelDefaults = {
				title: channel.title,
				skip: false,
				isChannel:
					channel.id === "6413623f5b12cca228a28e78"
						? `(post, video) => isChannel(post, '${channel.id}') && !video?.title?.toLowerCase().startsWith('caption')`
						: `(post) => isChannel(post, '${channel.id}')`,
			};
			if (subChannel === undefined) {
				settingSubscription.channels.push(channelDefaults);
			} else if (subChannel.isChannel === undefined) {
				// @ts-expect-error Identifiers have been replaced by isChannel
				delete subChannel.identifiers;
				subChannel.isChannel = channelDefaults.isChannel;
			}
		}

		if (settingSubscription.skip === true) continue;

		yield new Subscription(settings.subscriptions[userSubscription.creator]);
	}
}
