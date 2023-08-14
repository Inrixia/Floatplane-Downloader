import { quickStart, validatePlexSettings } from "./quickStart.js";
import { settings, fetchFFMPEG, fApi, args, DownloaderVersion } from "./lib/helpers.js";

import { loginFloatplane } from "./logins.js";
import { queueVideo } from "./Downloader.js";
import chalk from "chalk-template";

import type { ContentPost } from "floatplane/content";
import type { Video } from "./lib/Video.js";
import { fetchSubscriptions } from "./subscriptionFetching.js";

import semver from "semver";
const { gt, diff } = semver;

import { promptVideos } from "./lib/prompts/downloader.js";

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Yes, package.json isnt under src, this is fine
import pkg from "../package.json" assert { type: "json" };

async function fetchSubscriptionVideos(): Promise<Video[]> {
	// Function that pops items out of seek and destroy until the array is empty
	const posts: Promise<ContentPost>[] = [];
	while (settings.floatplane.seekAndDestroy.length > 0) {
		const guid = settings.floatplane.seekAndDestroy.pop();
		if (guid === undefined) continue;
		posts.push(fApi.content.post(guid));
	}

	const newVideos: Video[] = [];
	for await (const subscription of fetchSubscriptions()) {
		await subscription.deleteOldVideos();
		for await (const video of subscription.fetchNewVideos()) newVideos.push(video);
		for await (const video of subscription.seekAndDestroy(await Promise.all(posts))) newVideos.push(video);
	}
	return newVideos;
}

/**
 * Main function that triggeres everything else in the script
 */
const downloadNewVideos = async () => {
	if (settings.extras.promptVideos) {
		const promptedVideos = await promptVideos(await fetchSubscriptionVideos());
		return Promise.all(promptedVideos.map(queueVideo));
	}

	const subVideos = await fetchSubscriptionVideos();
	return Promise.all(subVideos.map(queueVideo));
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
			}.\nHead to {cyanBright https://github.com/Inrixia/Floatplane-Downloader/releases} to update!\n`,
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

	await downloadNewVideos();

	if (settings.floatplane.waitForNewVideos === true) {
		const waitLoop = async () => {
			await downloadNewVideos();
			setTimeout(waitLoop, 5 * 60 * 1000);
			console.log("[" + new Date().toLocaleTimeString() + "]" + " Checking for new videos in 5 minutes...");
		};
		waitLoop();
	}
})();
