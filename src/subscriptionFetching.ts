import type { Subscription as fApiSubscription } from "floatplane/user";
import type FloatplaneApi from "floatplane";
import type Video from "./lib/Video";

import { settings } from "./lib/helpers";
import { defaultSubChannels } from "./lib/defaults";
import Subscription from "./lib/Subscription";

import { fApi } from "./lib/FloatplaneAPI";

export const fetchSubscriptions = async (): Promise<Subscription[]> => (await fApi.user.subscriptions())
	.filter(subscription => settings.subscriptions[subscription.creator].skip !== true)
	.map(subscription => {
		// Add the subscription to settings if it doesnt exist
		const titleAlias = settings.channelAliases[subscription.plan.title.toLowerCase()]||subscription.plan.title;
		settings.subscriptions[subscription.creator] ??= {
			creatorId: subscription.creator,
			plan: subscription.plan.title,
			skip: false,
			channels: defaultSubChannels[titleAlias]
		};
		// Make sure that new subchannels from defaults are added to settings
		settings.subscriptions[subscription.creator].channels = { 
			...defaultSubChannels[titleAlias], 
			...settings.subscriptions[subscription.creator].channels 
		};
		// If no defaultSubChannels have been created for this subscription make sure the _default channel exists regardless
		if (settings.subscriptions[subscription.creator].channels._default === undefined) settings.subscriptions[subscription.creator].channels._default = {
			title: titleAlias,
			skip: false,
			identifiers: false
		};
		return new Subscription(settings.subscriptions[subscription.creator]);
	});

export const fetchSubscriptionVideos = async (subscription: fApiSubscription, fApi: FloatplaneApi): Promise<Video[]> => {
	const lastSeenVideo = sub.lastSeenVideo.videoGUID;

	// Search infinitely if we are resuming. Otherwise only grab the latest `settings.floatplane.videosToSearch` videos
	const videosToSearch = settings.floatplane.videosToSearch;

	let videosSearched = 0;
	let foundLastSeenVideo = false;
	const videos = [];
	
	const coloredTitle = `${settings.channelColors[titleAlias]||"\u001b[38;5;208m"}${titleAlias}\u001b[0m`;
	process.stdout.write(`> Fetching latest videos from [${coloredTitle}]... Fetched ${videos.length} videos!`);
	for await (const video of fApi.creator.blogPostsIterable(subscription.creator, { type: "video" })) {
		if (video.guid === lastSeenVideo || lastSeenVideo === "") foundLastSeenVideo = true;
		if (videosSearched >= videosToSearch && foundLastSeenVideo) break;
		videos.push(video);
		videosSearched++;
		process.stdout.write(`\r> Fetching latest videos from [${coloredTitle}]... Fetched ${videos.length} videos!`);
	}
	process.stdout.write("\n");

	// Make sure videos are in correct order for episode numbering, null episodes are part of a channel that is marked to be skipped
	const incompleteVideos: Video[] = [];
	for (const video of videos.sort((a, b) => (+new Date(a.releaseDate)) - (+new Date(b.releaseDate))).map(sub.addVideo)) {
		if (video !== null && !await video.isMuxed()) incompleteVideos.push(video);
	}
	process.stdout.write(` Skipped ${videos.length-incompleteVideos.length}.\n`);
	return incompleteVideos;
};