import type { Subscription as fApiSubscription } from "floatplane/user";
import type FloatplaneApi from "floatplane";
import type Video from "./lib/Video";

import { settings } from "./lib/helpers";
import { defaultSubChannels } from "./lib/defaults";
import Subscription from "./lib/Subscription";

export const fetchSubscriptionVideos = async (userSubscriptions: fApiSubscription[], fApi: FloatplaneApi): Promise<Video[]> => {
	const incompleteVideos: Video[] = [];
	for (const subscription of userSubscriptions) {
		// Add the subscription to settings if it doesnt exist
		const titleAlias = settings.channelAliases[subscription.plan.title.toLowerCase()]||subscription.plan.title;
		settings.subscriptions[subscription.creator] ??= {
			creatorId: subscription.creator,
			plan: subscription.plan.title,
			skip: false,
			channels: defaultSubChannels[titleAlias]
		};
		// Make sure that new subchannels from defaults are added to settings
		settings.subscriptions[subscription.creator].channels = { ...defaultSubChannels[titleAlias], ...settings.subscriptions[subscription.creator].channels };

		if (settings.subscriptions[subscription.creator].skip === true) continue;

		const sub = new Subscription(settings.subscriptions[subscription.creator]);
		const lastSeenVideo = sub.lastSeenVideo.videoGUID;

		// Search infinitely if we are resuming. Otherwise only grab the latest `settings.floatplane.videosToSearch` videos
		const videosToSearch = settings.floatplane.videosToSearch;

		let videosSearched = 0;
		let foundLastSeenVideo = false;
		const videos = [];
		
		process.stdout.write(`> Fetching latest videos from [\u001b[38;5;208m${titleAlias}\u001b[0m]... `);
		for await (const video of fApi.creator.videosIterable(subscription.creator)) {
			if (video.guid === lastSeenVideo) foundLastSeenVideo = true;
			if (videosSearched >= videosToSearch && foundLastSeenVideo) break;
			videos.push(video);
			videosSearched++;
		}
		process.stdout.write(`Fetched ${videos.length} videos!`);

		// Make sure videos are in correct order for episode numbering, null episodes are part of a channel that is marked to be skipped
		for (const video of videos.sort((a, b) => (+new Date(b.releaseDate)) - (+new Date(a.releaseDate))).map(sub.addVideo)) {
			if (video !== null && !await video.isMuxed()) incompleteVideos.push(video);
		}

		process.stdout.write(` Skipped ${videos.length-incompleteVideos.length}.\n`);
	}
	return incompleteVideos;
};