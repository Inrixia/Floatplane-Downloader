import { quickStart, validatePlexSettings } from "./quickStart.js";
import { fetchSubscriptions } from "./subscriptionFetching.js";
import { settings, fetchFFMPEG, fApi } from "./lib/helpers.js";
import { MyPlexAccount } from "@ctrl/plex";
import { loginFloatplane } from "./logins.js";
import Downloader from "./Downloader.js";
import chalk from "chalk-template";

import type Subscription from "./lib/Subscription.js";

import semver from "semver";
const { gt, diff } = semver;

/**
 * Main function that triggeres everything else in the script
 */
const fetchNewVideos = async (subscriptions: Array<Subscription>, videoProcessor: Downloader) => {
	for (const subscription of subscriptions) {
		await subscription.deleteOldVideos();
		console.log();
		await Promise.all(
			videoProcessor.processVideos(
				await subscription.fetchNewVideos(settings.floatplane.videosToSearch, settings.extras.stripSubchannelPrefix, settings.floatplane.forceFullSearch)
			)
		);
	}

	if (settings.plex.enabled) {
		process.stdout.write("> Refreshing plex sections... ");
		const plexApi = await new MyPlexAccount(undefined, undefined, undefined, settings.plex.token).connect();
		for (const sectionToUpdate of settings.plex.sectionsToUpdate) {
			await (await (await (await (await plexApi.resource(sectionToUpdate.server)).connect()).library()).section(sectionToUpdate.section)).refresh();
		}
		process.stdout.write(chalk`{cyanBright Done!}\n\n`);
	}
};

(async () => {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const version: string = process.env.npm_package_version ?? require("../package.json").version;
	const latest = await fApi
		.got("https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/package.json", { resolveBodyOnly: true })
		.then(JSON.parse)
		.catch(() => ({ version }));

	if (gt(latest.version, version))
		console.log(
			chalk`There is a ${diff(latest.version, version)} update available! ${version} > ${
				latest.version
			}.\nHead to {cyanBright https://github.com/Inrixia/Floatplane-Downloader/releases} to update!\n`
		);

	await fetchFFMPEG();
	// Earlybird functions, these are run before script start and not run again if script repeating is enabled.
	if (settings.runQuickstartPrompts) await quickStart();
	settings.runQuickstartPrompts = false;

	// Get Plex details if not saved
	await validatePlexSettings();

	// Get Floatplane credentials if not saved
	const isLoggedIn = await fApi.isAuthenticated();
	if (isLoggedIn !== true) {
		console.log(`Unable to authenticate with floatplane... ${isLoggedIn.message}\nPlease login to floatplane...`);
		await loginFloatplane();
	}

	process.stdout.write("> Fetching user subscriptions... ");
	const subscriptions = await fetchSubscriptions();
	process.stdout.write(chalk`{cyanBright Done!}\n\n`);

	const downloader = new Downloader();
	downloader.start();

	await fetchNewVideos(subscriptions, downloader);

	if (settings.floatplane.waitForNewVideos === true) {
		const waitLoop = async () => {
			await fetchNewVideos(subscriptions, downloader);
			setTimeout(waitLoop, 5 * 60 * 1000);
			console.log("Checking for new videos in 5 minutes...");
		};
		waitLoop();
	} else downloader.stop();
})();
