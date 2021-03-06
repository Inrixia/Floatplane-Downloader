import type { Subscription as fApiSubscription } from "floatplane/user";
import type FloatplaneApi from "floatplane";
import type Video from "./lib/Video";

import { writeableSettings as settings, subChannels, channelAliases } from "./lib/helpers";
import Subscription from "./lib/Subscription";

export const fetchNewSubscriptionVideos = async (userSubscriptions: fApiSubscription[], fApi: FloatplaneApi): Promise<Video[]> => {
	const videosToDownload: Video[] = [];
	for (const subscription of userSubscriptions) {
		// Add the subscription to settings if it doesnt exist
		const title = channelAliases[subscription.plan.title.toLowerCase()]||subscription.plan.title;
		settings.subscriptions[subscription.creator] ??= {
			creatorId: subscription.creator,
			title,
			skip: false,
			channels: subChannels[title]?.channels
		};
		// Make sure that subchannels are set on settings properly
		if (settings.subscriptions[subscription.creator].channels?.length !== subChannels[title]?.channels.length) {
			settings.subscriptions[subscription.creator].channels = subChannels[title]?.channels;
		}

		if (settings.subscriptions[subscription.creator].skip === true) continue;

		const sub = new Subscription(subscription, settings.subscriptions[subscription.creator].channels);
		const lastSeenVideo = sub.lastSeenVideo.videoGUID;

		// Search infinitely if we are resuming. Otherwise only grab the latest `settings.floatplane.videosToSearch` videos
		let videosToSearch = -1;
		if (lastSeenVideo === "") videosToSearch = settings.floatplane.videosToSearch;

		let videosSearched = 0;
		const videos = [];
		process.stdout.write(`> Fetching latest videos from [\u001b[38;5;208m${title}\u001b[0m]... `);
		for await (const video of fApi.creator.videosIterable(subscription.creator)) {
			if (videosSearched === videosToSearch || video.guid === lastSeenVideo) break;
			videos.push(video);
			videosSearched++;
		}
		process.stdout.write(`Fetched ${videos.length} videos!\n`);
		// Make sure videos are in correct order for episode numbering
		for (const video of videos.sort((a, b) => (+new Date(b.releaseDate)) - (+new Date(a.releaseDate))).map(sub.addVideo)) {
			if (video !== null && !await video.isDownloaded()) videosToDownload.push(video);
		}
	}
	return videosToDownload;
};