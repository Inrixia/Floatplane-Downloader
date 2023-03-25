import { defaultSubChannels } from "./lib/defaults.js";
import Subscription from "./lib/Subscription.js";
import { settings, fApi } from "./lib/helpers.js";

const channelAliases = {
	"linus tech tips": "Linus Tech Tips",
	"ltt supporter (og)": "Linus Tech Tips",
	"ltt supporter (1080p)": "Linus Tech Tips",
	"ltt supporter plus": "Linus Tech Tips",
};

export const fetchSubscriptions = async (): Promise<Subscription[]> =>
	(await fApi.user.subscriptions())
		.map((subscription) => {
			// Add the subscription to settings if it doesnt exist
			const titleAlias = settings.channelAliases[subscription.plan.title.toLowerCase()] || subscription.plan.title;
			settings.subscriptions[subscription.creator] ??= {
				creatorId: subscription.creator,
				plan: subscription.plan.title,
				skip: false,
				channels: defaultSubChannels[titleAlias],
			};

			const sub = settings.subscriptions[subscription.creator];

			// Translate old configs
			if (sub.channels !== undefined && !Array.isArray(sub.channels)) sub.channels = Object.values(sub.channels);

			// Make sure that new subchannels from defaults are added to settings
			if (defaultSubChannels[titleAlias] !== undefined) {
				const channelsToAdd = defaultSubChannels[titleAlias].filter((channel) => sub.channels.findIndex((chan) => chan.title === channel.title) === -1);
				if (channelsToAdd.length > 0) {
					sub.channels = [...sub.channels, ...channelsToAdd];
				}
			}

			// If a default channel isnt specified for this in defaultSubChannels then create a default
			if (settings.subscriptions[subscription.creator].channels.length === 0)
				settings.subscriptions[subscription.creator].channels = [
					{
						title: titleAlias,
						skip: false,
						daysToKeepVideos: -1,
					},
				];
			return new Subscription(settings.subscriptions[subscription.creator]);
		})
		.filter((subscription) => settings.subscriptions[subscription.creatorId].skip !== true);
