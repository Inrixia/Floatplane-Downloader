import { quickStart, validatePlexSettings } from "./quickStart.js";
import { fetchSubscriptions } from "./subscriptionFetching.js";
import { settings, fetchFFMPEG, fApi, args, DownloaderVersion } from "./lib/helpers.js";
import { MyPlexAccount } from "@ctrl/plex";
import { loginFloatplane } from "./logins.js";
import Downloader from "./Downloader.js";
import chalk from "chalk-template";

import type Subscription from "./lib/Subscription.js";
import type { ContentPost } from "floatplane/content";

import semver from "semver";
const { gt, diff } = semver;

import { promptVideos } from "./lib/prompts/downloader.js";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Yes, package.json isnt under src, this is fine
import pkg from "../package.json" assert { type: "json" };
import Video from "./lib/Video.js";

/**
 * Main function that triggeres everything else in the script
 */
const fetchNewVideos = async (subscriptions: Array<Subscription>, videoProcessor: Downloader) => {
	// Function that pops items out of seek and destroy until the array is empty
	const posts: Promise<ContentPost>[] = [];
	while (settings.floatplane.seekAndDestroy.length > 0) {
		const guid = settings.floatplane.seekAndDestroy.pop();
		if (guid === undefined) continue;
		posts.push(fApi.content.post(guid));
	}
	let newVideos: Video[] = [];

	for (const subscription of subscriptions) {
		await subscription.deleteOldVideos();
		console.log();
		const subVideos = await subscription.fetchNewVideos(
			settings.floatplane.videosToSearch,
			settings.extras.stripSubchannelPrefix,
			settings.floatplane.forceFullSearch
		);
		const seekVideos = await subscription.seekAndDestroy(await Promise.all(posts), settings.extras.stripSubchannelPrefix);
		newVideos = [...newVideos, ...subVideos, ...seekVideos];
	}

	if (newVideos.length !== 0) {
		if (settings.extras.promptVideos) newVideos = await promptVideos(newVideos);
		// If processing videos does not complete then forceFullSearch next run to recover
		settings.floatplane.forceFullSearch = true;
		await Promise.all(videoProcessor.processVideos(newVideos));
		settings.floatplane.forceFullSearch = false;
		if (settings.plex.enabled) {
			process.stdout.write("> Refreshing plex sections... ");
			const plexApi = await new MyPlexAccount(undefined, undefined, undefined, settings.plex.token).connect();
			for (const sectionToUpdate of settings.plex.sectionsToUpdate) {
				await (await (await (await (await plexApi.resource(sectionToUpdate.server)).connect()).library()).section(sectionToUpdate.section)).refresh();
			}
			process.stdout.write(chalk`{cyanBright Done!}\n\n`);
		}
	}
};

// Fix for docker
process.on("SIGTERM", process.exit);

(async () => {
	if (args.sanityCheck && DownloaderVersion !== pkg.version) {
		throw new Error(`Version mismatch! package.json says ${pkg.version} but float.ts says ${DownloaderVersion}`);
	}

	const latest = await fApi
		.got("https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/package.json")
		.json<{ version: string }>()
		.catch(() => ({ version: DownloaderVersion }));

	if (gt(latest.version, DownloaderVersion))
		console.log(
			chalk`There is a ${diff(latest.version, DownloaderVersion)} update available! ${DownloaderVersion} > ${
				latest.version
			}.\nHead to {cyanBright https://github.com/Inrixia/Floatplane-Downloader/releases} to update!\n`
		);

	if (args.sanityCheck) {
		console.log("Sanity check passed!");
		process.exit();
	}

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
			console.log("[" + new Date().toLocaleTimeString() + "]" + " Checking for new videos in 5 minutes...");
		};
		waitLoop();
	} else downloader.stop();
})();
