import fs from "fs";

import db from "@inrixia/db";
import ARGV from "process.argv";

import { defaultArgs, defaultSettings } from "./defaults";
import type { Args, PartialArgs, Settings } from "./types";

import { getEnv, rebuildTypes, recursiveUpdate } from "@inrixia/helpers/object";

import { downloadBinaries, detectPlatform, getBinaryFilename } from "ffbinaries";

export const settings = db<Settings>("./db/settings.json", { template: defaultSettings, pretty: true, forceCreate: true });
recursiveUpdate(settings, defaultSettings);

const argv = ARGV(process.argv.slice(2))<PartialArgs>({});
rebuildTypes<PartialArgs, Settings & Args>(argv, { ...defaultSettings, ...defaultArgs });
recursiveUpdate(settings, argv, { setUndefined: false, setDefined: true });

const env = getEnv();
rebuildTypes<PartialArgs, Settings & Args>(env, { ...defaultSettings, ...defaultArgs });
recursiveUpdate(settings, env, { setUndefined: false, setDefined: true });

export const args = { ...argv, ...env };

export const fetchFFMPEG = (): Promise<void> => new Promise((resolve, reject) => {
	const platform = detectPlatform();
	if (fs.existsSync(`./db/${getBinaryFilename("ffmpeg", platform)}`) === false) {
		process.stdout.write("> Ffmpeg binary missing! Downloading... ");
		downloadBinaries("ffmpeg", {
			destination: "./db/",
			platform
		}, err => {
			if (err !== null) reject(err);
			else {
				process.stdout.write("\u001b[36mDone!\u001b[0m\n\n");
				resolve();
			}
		});
	} else resolve();
});