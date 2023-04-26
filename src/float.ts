import { quickStart, validatePlexSettings } from "./quickStart.js";
import { fetchSubscriptions } from "./subscriptionFetching.js";
import { settings, fetchFFMPEG, fApi, args, DownloaderVersion } from "./lib/helpers.js";

import { loginFloatplane } from "./logins.js";
import { queueVideo } from "./Downloader.js";
import chalk from "chalk-template";

import type Subscription from "./lib/Subscription.js";
import type { ContentPost } from "floatplane/content";
import type { Video } from "./lib/Video.js";

import semver from "semver";
const { gt, diff } = semver;

import { promptVideos } from "./lib/prompts/downloader.js";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Yes, package.json isnt under src, this is fine
import pkg from "../package.json" assert { type: "json" };

async function* fetchSubscriptionVideos(subscriptions: Array<Subscription>) {
	// Function that pops items out of seek and destroy until the array is empty
	const posts: Promise<ContentPost>[] = [];
	while (settings.floatplane.seekAndDestroy.length > 0) {
		const guid = settings.floatplane.seekAndDestroy.pop();
		if (guid === undefined) continue;
		posts.push(fApi.content.post(guid));
	}

	for (const subscription of subscriptions) {
		await subscription.deleteOldVideos();
		for await (const video of subscription.fetchNewVideos()) yield video;
		for await (const video of subscription.seekAndDestroy(await Promise.all(posts))) yield video;
	}
}

/**
 * Main function that triggeres everything else in the script
 */
const downloadNewVideos = async (subscriptions: Array<Subscription>) => {
	if (settings.extras.promptVideos) {
		const newVideos: Video[] = [];
		for await (const video of fetchSubscriptionVideos(subscriptions)) newVideos.push(video);
		promptVideos(newVideos).then((newVideos) => newVideos.map(queueVideo));
		return;
	}

	for await (const video of fetchSubscriptionVideos(subscriptions)) await queueVideo(video);
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

	await downloadNewVideos(subscriptions);

	if (settings.floatplane.waitForNewVideos === true) {
		const waitLoop = async () => {
			await downloadNewVideos(subscriptions);
			setTimeout(waitLoop, 5 * 60 * 1000);
			console.log("[" + new Date().toLocaleTimeString() + "]" + " Checking for new videos in 5 minutes...");
		};
		waitLoop();
	}
})();
