import { writeableSettings as settings, findClosestEdge, autoRepeat } from "./lib/helpers";

import { cookieJar, fApi } from "./lib/FloatplaneAPI";

import { quickStart, validatePlexSettings } from "./quickStart";

import { loginFloatplane } from "./logins";

import { fetchNewSubscriptionVideos } from "./fetchers";

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
	const userSubscriptions = await fApi.user.subscriptions();
	process.stdout.write("\u001b[36mDone!\u001b[0m\n\n");

	console.log(await fetchNewSubscriptionVideos(userSubscriptions, fApi));
};

// Async start
(async () => {
	// Earlybird functions, these are run before script start and not run again if script repeating is enabled.
	if (settings.runQuickstartPrompts) await quickStart(settings, fApi);
	settings.runQuickstartPrompts = false;

	// Get Plex details of not saved
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