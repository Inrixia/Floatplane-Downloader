import { loginFloatplane, loginPlex } from './logins.js';
import { defaultResolutions } from './lib/defaults.js';
import { args, settings } from './lib/helpers.js';
import { MyPlexAccount } from '@ctrl/plex';
import { fApi } from './lib/FloatplaneAPI.js';
import * as prompts from './lib/prompts/index.js';

import type { Extras } from './lib/types.js';

export const promptPlexSections = async (): Promise<void> => {
	const plexApi = await new MyPlexAccount(undefined, undefined, undefined, settings.plex.token).connect();
	const servers = (await plexApi.resources()).filter((resource) => resource.provides.split(',').indexOf('server') !== -1);
	const serverSections = await Promise.all(
		servers.map(async (server) => {
			const connectedServer = await server.connect();
			const library = await connectedServer.library();
			return (await library.sections()).filter((section) => section.type === 'show');
		})
	);
	settings.plex.sectionsToUpdate = await prompts.plex.sections(
		settings.plex.sectionsToUpdate,
		serverSections.flatMap((sections) => sections)
	);
	if (settings.plex.sectionsToUpdate.length === 0) {
		console.log('No sectionsToUpdate in config! Disabling plex integration...\n');
		settings.plex.enabled = false;
	}
};

export const validatePlexSettings = async (): Promise<void> => {
	if (settings.plex.enabled) {
		if (settings.plex.token === '') {
			console.log('Missing plex token!');
			settings.plex.token = await loginPlex();
		}
		if (settings.plex.sectionsToUpdate.length === 0) {
			console.log('No plex sections specified to update!');
			await promptPlexSections();
		}
	}
};

export const quickStart = async (): Promise<void> => {
	console.log('Welcome to Floatplane Downloader! Thanks for checking it out <3.');
	console.log('According to your settings.json this is your first launch! So lets go through the basic setup...\n');

	console.log('\n== \u001b[38;5;208mFloatplane\u001b[0m ==\n');
	// Dont re-prompt for credentials if we are already logged in
	if ((await fApi.isAuthenticated()) !== true) {
		console.log('Please login to floatplane...');
		await loginFloatplane();
	} else console.log('Already logged in!');

	console.log('\n== \u001b[38;5;208mGeneral\u001b[0m ==\n');
	settings.floatplane.videosToSearch = await prompts.floatplane.videosToSearch(settings.floatplane.videosToSearch);
	settings.downloadThreads = await prompts.settings.downloadThreads(settings.downloadThreads);
	settings.floatplane.videoResolution = await prompts.settings.videoResolution(settings.floatplane.videoResolution, defaultResolutions);
	settings.filePathFormatting = await prompts.settings.fileFormatting(settings.filePathFormatting, settings._filePathFormattingOPTIONS);

	const extras = await prompts.settings.extras(settings.extras);
	if (extras !== undefined) {
		for (const extra in settings.extras) settings.extras[extra as keyof Extras] = extras.indexOf(extra) > -1 ? true : false;
	}

	console.log('\n== \u001b[38;5;208mPlex\u001b[0m ==\n');
	settings.plex.enabled = await prompts.plex.usePlex(settings.plex.enabled);
	if (settings.plex.enabled) {
		if (settings.plex.token === '') settings.plex.token = await loginPlex();
		if (args.headless !== true) await promptPlexSections();
	}
	console.log('\n== \u001b[36mAll Setup!\u001b[0m ==\n');
};
