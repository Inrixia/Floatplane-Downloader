import { downloadBinaries, detectPlatform, getBinaryFilename } from 'ffbinaries';
import { getEnv, rebuildTypes, recursiveUpdate } from '@inrixia/helpers/object';
import { defaultArgs, defaultSettings } from './defaults';
import ARGV from 'process.argv';
import db from '@inrixia/db';
import fs from 'fs';

import type { Args, PartialArgs, Settings } from './types';

export const settings = db<Settings>('./db/settings.json', { template: defaultSettings, pretty: true, forceCreate: true });
recursiveUpdate(settings, defaultSettings);

const argv = ARGV(process.argv.slice(2))<PartialArgs>({});
rebuildTypes<PartialArgs, Settings & Args>(argv, { ...defaultSettings, ...defaultArgs });
recursiveUpdate(settings, argv, { setUndefined: false, setDefined: true });

const env = getEnv();
rebuildTypes<PartialArgs, Settings & Args>(env, { ...defaultSettings, ...defaultArgs });
recursiveUpdate(settings, env, { setUndefined: false, setDefined: true });

export const args = { ...argv, ...env };

// Override stdout if headless to not include formatting tags
if (args.headless === true) {
	const originalStdoutWrite = process.stdout.write.bind(process.stdout);
	type StdoutArgs = Parameters<typeof process.stdout.write>;

	process.stdout.write = ((...params: StdoutArgs) => {
		// eslint-disable-next-line no-control-regex
		if (typeof params[0] === 'string') params[0] = params[0].replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
		return originalStdoutWrite(...params);
	}) as typeof process.stdout.write;
}