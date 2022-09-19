import { defaultSubChannels } from "./lib/defaults.js";
import Subscription from "./lib/Subscription.js";
import { settings, fApi } from "./lib/helpers.js";

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
			// Make sure that new subchannels from defaults are added to settings
			settings.subscriptions[subscription.creator].channels = {
				...defaultSubChannels[titleAlias],
				...settings.subscriptions[subscription.creator].channels,
			};
			// If no defaultSubChannels have been created for this subscription make sure the _default channel exists regardless
			if (settings.subscriptions[subscription.creator].channels._default === undefined)
				settings.subscriptions[subscription.creator].channels._default = {
					title: titleAlias,
					skip: false,
					identifiers: false,
					daysToKeepVideos: -1,
				};
			return new Subscription(settings.subscriptions[subscription.creator]);
		})
		.filter((subscription) => settings.subscriptions[subscription.creatorId].skip !== true);
