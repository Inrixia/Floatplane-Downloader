import { MyPlexAccount } from "@ctrl/plex";
import { defaultResolutions } from "./lib/defaults";
import { args, fApi, settings } from "./lib/helpers/index";
import * as prompts from "./lib/prompts/index";
import { loginFloatplane, loginPlex } from "./logins";

import { multiSelectChannelPrompt, selectSubscriptionPrompt } from "./lib/prompts/settings";
import { PROMPT_CONFIRM, Settings, type Extras } from "./lib/types";
import { Video } from "./lib/Video";

export const promptPlexSections = async (): Promise<void> => {
	const plexApi = await new MyPlexAccount(undefined, undefined, undefined, settings.plex.token).connect();
	const servers = (await plexApi.resources()).filter((resource) => resource.provides.split(",").indexOf("server") !== -1);
	const serverSections = await Promise.all(
		servers.map(async (server) => {
			const connectedServer = await server.connect();
			const library = await connectedServer.library();
			return (await library.sections()).filter((section) => section.type === "show");
		})
	);
	settings.plex.sectionsToUpdate = await prompts.plex.sections(
		settings.plex.sectionsToUpdate,
		serverSections.flatMap((sections) => sections)
	);
	await validatePlexSettings();
};

export const validatePlexSettings = async (): Promise<void> => {
	if (settings.plex.enabled) {
		if (settings.plex.token === "") {
			console.log("Missing plex token!");
			settings.plex.token = await loginPlex();
		}
		if (settings.plex.sectionsToUpdate.length === 0) {
			console.log("No sectionsToUpdate in config! Disabling plex integration...\n");
			settings.plex.enabled = false;
		}
		await new MyPlexAccount(undefined, undefined, undefined, settings.plex.token).connect().catch((err) => {
			console.error(`Failed to connect to plex, disabling plex refreshing! ${err.message}`);
			settings.plex.enabled = false;
		});
	}
};

export const promptSubscriptionSection = async (): Promise<void> => {
	const userSubscription = await fApi.user.subscriptions();
	const channels = await fApi.creator.channels(userSubscription.map((channel) => channel.creator));

	const subscriptions = userSubscription.reduce<Settings["subscriptions"]>((acc, subscription) => {
		acc[subscription.creator] = {
			creatorId: subscription.creator,
			plan: subscription.plan.title,
			skip: false,
			channels: channels
				.filter((channel) => channel.creator === subscription.creator)
				.map((channel) => ({
					title: channel.title,
					skip: false,
					isChannel:
						channel.id === "6413623f5b12cca228a28e78"
							? `(post, video) => isChannel(post, '${channel.id}') && !video?.title?.toLowerCase().startsWith('caption')`
							: `(post) => isChannel(post, '${channel.id}')`,
				})),
		};
		return acc;
	}, {});

	let selectedSubscriptionId: string | undefined = undefined;

	while (selectedSubscriptionId !== PROMPT_CONFIRM) {
		selectedSubscriptionId = await selectSubscriptionPrompt(subscriptions);

		const subscription = subscriptions[selectedSubscriptionId];

		if (subscription) {
			const selectedChannels = await multiSelectChannelPrompt(subscription.channels);
			subscription.channels = subscription.channels.map((channel) => ({ ...channel, skip: !selectedChannels.includes(channel.title) }));
		}
	}

	for (const subscription of Object.values(subscriptions)) {
		settings.subscriptions[subscription.creatorId] ??= {
			creatorId: subscription.creatorId,
			plan: subscription.plan,
			skip: false,
			channels: subscription.channels.map((channel) => ({ title: channel.title, skip: channel.skip, isChannel: channel.isChannel })),
		};
	}
};

export const quickStart = async (): Promise<void> => {
	console.log("Welcome to Floatplane Downloader! Thanks for checking it out <3.");
	console.log("According to your settings.json this is your first launch! So lets go through the basic setup...\n");

	console.log("\n== \u001b[38;5;208mFloatplane\u001b[0m ==\n");
	// Dont re-prompt for credentials if we are already logged in
	if ((await fApi.isAuthenticated()) !== true) {
		console.log("Please login to floatplane...");
		await loginFloatplane();
	} else console.log("Already logged in!");

	console.log("\n== \u001b[38;5;208mGeneral\u001b[0m ==\n");
	settings.floatplane.videosToSearch = await prompts.floatplane.videosToSearch(settings.floatplane.videosToSearch);
	settings.floatplane.videoResolution = await prompts.settings.videoResolution(settings.floatplane.videoResolution, defaultResolutions);
	settings.filePathFormatting = await prompts.settings.fileFormatting(settings.filePathFormatting, Video.FilePathOptions);

	const extras = await prompts.settings.extras(settings.extras);
	if (extras !== undefined) {
		for (const extra in settings.extras) settings.extras[extra as keyof Extras] = extras.indexOf(extra) > -1 ? true : false;
	}

	console.log("\n== \u001b[38;5;208mSubscriptions\u001b[0m ==\n");
	await promptSubscriptionSection();

	console.log("\n== \u001b[38;5;208mPlex\u001b[0m ==\n");
	settings.plex.enabled = await prompts.plex.usePlex(settings.plex.enabled);
	if (settings.plex.enabled) {
		if (settings.plex.token === "") settings.plex.token = await loginPlex();
		if (args.headless !== true) await promptPlexSections();
	}
	console.log("\n== \u001b[36mAll Setup!\u001b[0m ==\n");
};
