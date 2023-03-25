import { defaultSubChannels } from "./lib/defaults.js";
import Subscription from "./lib/Subscription.js";
import { settings, fApi } from "./lib/helpers.js";

export const fetchSubscriptions = async (): Promise<Subscription[]> => {
	const subscriptions = await fApi.user.subscriptions();
	const filledSubs = await Promise.all(
		subscriptions.map(async (subscription) => {
			// Add the subscription to settings if it doesnt exist
			if (settings.subscriptions[subscription.creator] === undefined) {
				settings.subscriptions[subscription.creator] = {
					creatorId: subscription.creator,
					plan: subscription.plan.title,
					skip: false,
					channels: defaultSubChannels[subscription.creator] ?? [],
				};
			}
			const sub = settings.subscriptions[subscription.creator];

			// Make sure that new subchannels from defaults are added to settings
			if (defaultSubChannels[subscription.creator] !== undefined) {
				const channelsToAdd = defaultSubChannels[subscription.creator].filter((channel) => sub.channels.findIndex((chan) => chan.title === channel.title) === -1);
				if (channelsToAdd.length > 0) sub.channels = [...sub.channels, ...channelsToAdd];
			}

			const subChannels = await fApi.creator.channels([subscription.creator]);
			for (const channel of subChannels) {
				if (sub.channels.findIndex((chan) => chan.title === channel.title) === -1)
					sub.channels.push({
						title: channel.title,
						skip: false,
						identifiers: [{ type: "channelId", check: channel.id }],
					});
			}

			return new Subscription(settings.subscriptions[subscription.creator]);
		})
	);
	return filledSubs.filter((subscription) => settings.subscriptions[subscription.creatorId].skip !== true);
};
