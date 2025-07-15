import { defaultSettings } from "./lib/defaults";
import { fetchFFMPEG } from "./lib/helpers/fetchFFMPEG";
import { args, DownloaderVersion, fApi, settings } from "./lib/helpers/index";
import { initProm } from "./lib/prometheus";
import { quickStart, validatePlexSettings } from "./quickStart";

import chalk from "chalk-template";
import { loginFloatplane, User } from "./logins";

import { fetchSubscriptions } from "./subscriptionFetching";

import semver from "semver";
const { gt, diff } = semver;

import type { ContentPost } from "floatplane/content";
import { Self } from "floatplane/user";

/**
 * Main function that triggeres everything else in the script
 */
const downloadNewVideos = async () => {
	const inProgress = [];
	let videos = 0;
	let textTracks = 0;

	// Fetch content posts from seek and destroy guids
	const contentPosts: Promise<ContentPost>[] = [];
	while (settings.floatplane.seekAndDestroy.length > 0) {
		const guid = settings.floatplane.seekAndDestroy.pop();
		if (guid === undefined) continue;
		console.log(chalk`Seek and Destroy: {red ${guid}}`);
		contentPosts.push(fApi.content.post(guid));
	}

	for await (const subscription of fetchSubscriptions()) {
		// Seek and destroy posts if the content post belongs to this subscription
		for await (const contentPost of contentPosts) {
			if (contentPost.creator.id === subscription.creatorId) {
				for await (const video of subscription.seekAndDestroy(contentPost)) {
					inProgress.push(video.download());
					videos++;
				}
			}
		}
		await subscription.deleteOldVideos();
		for await (const video of subscription.fetchNewVideos()) {
			inProgress.push(video.download());
			if (settings.extras.downloadCaptions) {
				inProgress.push(video.updateTextTracks());
				textTracks++;
			}
		}
	}

	if (textTracks === 0) console.log(chalk`Queued {green ${inProgress.length}} videos...`);
	else console.log(chalk`Queued {green ${inProgress.length}} videos and {green ${textTracks}} text tracks...`);
	await Promise.all(inProgress);

	// Enforce search limits after searching once.
	settings.floatplane.videosToSearch = defaultSettings.floatplane.videosToSearch;

	if (settings.floatplane.waitForNewVideos === true) {
		console.log(`Checking for new videos in 5 minutes...`);
		setTimeout(downloadNewVideos, 5 * 60 * 1000);
	}
};

// Fix for docker
process.on("SIGTERM", () => process.exit(143));

(async () => {
	if (!args.headless) {
		console.log(chalk`\n{red ///}{grey ===} {cyan Console} {grey ===}{red \\\\\\}`);
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
		process.exit(0);
	}

	// Earlybird functions, these are run before script start and not run again if script repeating is enabled.
	await fetchFFMPEG();
	if (settings.runQuickstartPrompts) {
		if (args.headless) console.log("headless is set to true! Skipping quickstart prompts.");
		else await quickStart();
	}
	settings.runQuickstartPrompts = false;

	// Get Plex details if not saved
	await validatePlexSettings();

	// Get Floatplane credentials if not saved
	let user: Self | User;
	try {
		user = await fApi.user.self();
	} catch (err) {
		console.log(`Unable to authenticate with floatplane... ${(<Error>err).message}\nPlease login to floatplane...`);
		user = await loginFloatplane();
	}
	await initProm(user!.id);

	console.log(chalk`Initalized! Running version {cyan ${DownloaderVersion}} instance {magenta ${user!.id}}`);

	await downloadNewVideos();
})();
