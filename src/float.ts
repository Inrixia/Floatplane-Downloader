import { quickStart, validatePlexSettings } from './quickStart';
import { fetchSubscriptions } from './subscriptionFetching';
import { settings } from './lib/helpers';
import { MyPlexAccount } from '@ctrl/plex';
import { fApi } from './lib/FloatplaneAPI';
import { loginFloatplane } from './logins';
import Downloader from './downloader';
import { gt, diff } from 'semver';

import type Subscription from './lib/Subscription';

/**
 * Main function that triggeres everything else in the script
 */
const fetchNewVideos = async (subscriptions: Array<Subscription>, videoProcessor: Downloader) => {
	for (const subscription of subscriptions) {
		await Promise.all(videoProcessor.processVideos(await subscription.fetchNewVideos(settings.floatplane.videosToSearch, settings.extras.stripSubchannelPrefix)));
	}

	if (settings.plex.enabled) {
		process.stdout.write('> Refreshing plex sections... ');
		const plexApi = await new MyPlexAccount(undefined, undefined, undefined, settings.plex.token).connect();
		for (const sectionToUpdate of settings.plex.sectionsToUpdate) {
			await (await (await (await (await plexApi.resource(sectionToUpdate.server)).connect()).library()).section(sectionToUpdate.section)).refresh();
		}
		process.stdout.write('\u001b[36mDone!\u001b[0m\n\n');
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
			`There is a ${diff(latest.version, version)} update avalible! ${version} > ${
				latest.version
			}.\nHead to \u001b[36mhttps://github.com/Inrixia/Floatplane-Downloader/releases\u001b[0m to update!\n`
		);

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
	process.stdout.write('\u001b[36mDone!\u001b[0m\n\n');

	const downloader = new Downloader();
	downloader.start();

	await fetchNewVideos(subscriptions, downloader);

	if (settings.floatplane.waitForNewVideos === true) {
		fApi.sails.on('syncEvent', (syncEvent) => {
			if (syncEvent.event === 'postRelease') fetchNewVideos(subscriptions, downloader);
		});

		process.stdout.write('Connecting to floatplane notifications for new videos... ');
		process.stdout.write(`${(await fApi.sails.connect()).message}\n`);
	} else downloader.stop();
})().catch((err) => {
	console.error('An error occurred!');
	console.error(err);
	process.exit(1);
});
