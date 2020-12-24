import { plex as plexPrompts } from "./lib/prompts";

import { writeableSettings as settings, findClosestEdge, autoRepeat } from "./lib/helpers"

import { FileCookieStore } from "tough-cookie-file-store";
import { CookieJar } from "tough-cookie";
const cookieJar = new CookieJar(new FileCookieStore("./db/cookies.json"))

import FloatplaneApi from "floatplane"
const fApi = new FloatplaneApi(cookieJar);

import { quickStart, promptPlexSections } from "./quickStart";

import { loginFloatplane, loginPlex } from "./logins";

import { fetchNewSubscriptionVideos } from "./fetchers";

/**
 * Main function that triggeres everything else in the script
 */
const startFetching = async () => {
	if (settings.floatplane.findClosestEdge) {
		process.stdout.write("> Finding closest edge server...");
		settings.floatplane.edge = `https://${findClosestEdge(await fApi.api.edges()).hostname}`;
		process.stdout.write(` \u001b[36mFound! Using Server \u001b[0m[\u001b[38;5;208m${settings.floatplane.edge}\u001b[0m]\n`);
	}

	process.stdout.write("> Fetching user subscriptions...");
	const userSubscriptions = await fApi.user.subscriptions()
	process.stdout.write("\u001b[36m Done!\u001b[0m\n\n");

	console.log(await fetchNewSubscriptionVideos(userSubscriptions, fApi))
};

// Async start
;(async () => {
	// Earlybird functions, these are run before script start and not run again if script repeating is enabled.
	if (settings.runQuickstartPrompts) await quickStart(settings, fApi);
	settings.runQuickstartPrompts = false;

	// Get Plex details of not saved
	if (settings.plex.enabled) {
		if (settings.plex.sectionsToUpdate.length === 0) {
			console.log("You have plex integration enabled but no sections set for updating!");
			await promptPlexSections(settings.plex);
		}
		if (!settings.plex.hostname) {
			console.log("You have plex integration enabled but have not specified a hostname!");
			settings.plex.hostname = await plexPrompts.hostname(settings.plex.hostname);
		} 
		if (!settings.plex.port) {
			console.log("You have plex integration enabled but have not specified a port!");
			settings.plex.port = await plexPrompts.port(settings.plex.port);
		} 
		if (!settings.plex.token) {
			console.log("You have plex integration enabled but no token exists!");
			await loginPlex(settings.plex.hostname, settings.plex.port);
		}
	}

	// Get Floatplane credentials if not saved
	if (cookieJar.toJSON().cookies.length === 0) {
		console.log("No floatplane cookies found! Please re-enter floatplane details...");
		await loginFloatplane(fApi);
	}

	if (settings.repeat.enabled === true) autoRepeat(startFetching)
	else await startFetching();
})().catch(err => {
	console.error("An error occurred!");
	console.error(err);
	process.exit(1);
});