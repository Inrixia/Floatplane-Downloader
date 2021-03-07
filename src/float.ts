import { settings, findClosestEdge, autoRepeat } from "./lib/helpers";

import { cookieJar, fApi } from "./lib/FloatplaneAPI";

import { quickStart, validatePlexSettings } from "./quickStart";

import { loginFloatplane } from "./logins";

import { fetchNewSubscriptionVideos } from "./fetchers";

import type { Subscription } from "floatplane/user";

import { downloadVideos } from "./downloader";
import { MyPlexAccount } from "@ctrl/plex";

/**
 * Main function that triggeres everything else in the script
 */
const startFetching = async () => {
	if (settings.floatplane.findClosestEdge) {
		process.stdout.write("> Finding closest edge server... ");
		settings.floatplane.edge = `https://${findClosestEdge(await fApi.api.edges()).hostname}`;
		process.stdout.write(`\u001b[36mFound! Using Server \u001b[0m[\u001b[38;5;208m${settings.floatplane.edge}\u001b[0m]\n`);
	}

	process.stdout.write("> Fetching user subscriptions... ");
	let userSubscriptions: Array<Subscription>;
	try {
		userSubscriptions = await fApi.user.subscriptions();
	} catch (err) {
		console.log((err as Error).message);
		await loginFloatplane(fApi);
		userSubscriptions = await fApi.user.subscriptions();
	}
	process.stdout.write("\u001b[36mDone!\u001b[0m\n\n");

	const videostoDownload = await fetchNewSubscriptionVideos(userSubscriptions, fApi);
	await Promise.all(downloadVideos(videostoDownload));
	console.log("OwO Plexmo");
	const plexApi = await (new MyPlexAccount(undefined, undefined, undefined, settings.plex.token).connect());
	console.log(await (await (await ((await (await plexApi.resource(settings.plex.sectionsToUpdate[0].server)).connect()).library())).section(settings.plex.sectionsToUpdate[0].section)).refresh());
	console.log("All videos downloaded!!");
};

// Async start
(async () => {
	// Earlybird functions, these are run before script start and not run again if script repeating is enabled.
	if (settings.runQuickstartPrompts) await quickStart(settings, fApi);
	settings.runQuickstartPrompts = false;

	// Get Plex details if not saved
	await validatePlexSettings(settings.plex, true);

	// Get Floatplane credentials if not saved
	if (cookieJar.toJSON().cookies.length === 0) {
		console.log("No floatplane cookies found! Please re-enter floatplane details...");
		await loginFloatplane(fApi);
	}

	if (settings.repeat.enabled === true) autoRepeat(startFetching);
	else await startFetching();
})().catch(err => {
	console.error("An error occurred!");
	console.error(err);
	process.exit(1);
});