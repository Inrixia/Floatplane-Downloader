import { quickStart, validatePlexSettings } from './quickStart';
import { fetchSubscriptions } from './subscriptionFetching';
import { settings, fetchFFMPEG } from './lib/helpers';
import { MyPlexAccount } from '@ctrl/plex';
import { fApi } from './lib/FloatplaneAPI';
import { loginFloatplane } from './logins';
import Downloader from './Downloader';
import { gt, diff } from 'semver';
import { resolve } from 'path';
import chalk from 'chalk';

import type Subscription from './lib/Subscription';

/**
 * Main function that triggeres everything else in the script
 */
const fetchNewVideos = async (subscriptions: Array<Subscription>, videoProcessor: Downloader) => {
	for (const subscription of subscriptions) {
		await subscription.deleteOldVideos();
		console.log();
		await Promise.all(videoProcessor.processVideos(await subscription.fetchNewVideos(settings.floatplane.videosToSearch, settings.extras.stripSubchannelPrefix)));
	}

	if (settings.plex.enabled) {
		process.stdout.write('> Refreshing plex sections... ');
		const plexApi = await new MyPlexAccount(undefined, undefined, undefined, settings.plex.token).connect();
		for (const sectionToUpdate of settings.plex.sectionsToUpdate) {
			await (await (await (await (await plexApi.resource(sectionToUpdate.server)).connect()).library()).section(sectionToUpdate.section)).refresh();
		}
		process.stdout.write(chalk`{cyanBright Done!}\n\n`);
	}
};

// Async start
(async () => {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const version: string = require('../package.json').version;
	const latest = await fApi
		.got('https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/package.json', { resolveBodyOnly: true })
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

	process.stdout.write('> Fetching user subscriptions... ');
	const subscriptions = await fetchSubscriptions();
	process.stdout.write(chalk`{cyanBright Done!}\n\n`);

	const downloader = new Downloader();
	downloader.start();

	await fetchNewVideos(subscriptions, downloader);

	if (settings.floatplane.waitForNewVideos === true) {
		const waitLoop = async () => {
			await fetchNewVideos(subscriptions, downloader);
			setTimeout(waitLoop, 5 * 60 * 1000);
			console.log('Checking for new videos in 5 minutes...');
		};
		waitLoop();
	} else downloader.stop();
})().catch((err) => {
	console.error('An error occurred!');
	console.error(err);
	process.exit(1);
});
