import db from "@inrixia/db";

import { isObject } from "@inrixia/helpers/object";

import type { CLIArguments, Settings } from "./types";
import { defaultSettings } from "./defaults";

import fs from "fs";

import { downloadBinaries, detectPlatform, getBinaryFilename } from "ffbinaries";

import ARGV from "process.argv";


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rebuildTypes = <O extends T, T extends { [key: string]: any }>(object: O, types: T) => {
	for (const key in object) {
		if (types[key] === undefined) continue;
		switch (typeof types[key]) {
		case "number":
			(object[key] as number) = +object[key];
			break;
		case "string":
			object[key] = object[key].toString();
			break;
		case "boolean":
			(object[key] as boolean) = object[key] === "true";
			break;
		default:
			rebuildTypes(object[key], types[key]);
			break;
		}
	}
	return object;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const recursiveUpdate = (targetObject: any, newObject: any, setUndefined = true, setDefined = false) => {
	if (!isObject(targetObject)) throw new Error("targetObject is not an object!");
	if (!isObject(newObject)) throw new Error("newObject is not an object!");
	for (const key in newObject) {
		if (targetObject[key] === undefined) {
			if (setUndefined) targetObject[key] = newObject[key];
		} else if (setDefined) targetObject[key] = newObject[key];
		else if (isObject(targetObject[key]) && isObject(newObject[key])) recursiveUpdate(targetObject[key], newObject[key]);
	}
};



export const settings = db<Settings>("./db/settings.json", defaultSettings, { pretty: true });
recursiveUpdate(settings, defaultSettings);

// Update settings with argv parameters & export argv
export const argv = rebuildTypes<CLIArguments, Partial<Settings>>(ARGV(process.argv.slice(2))<CLIArguments>({}), defaultSettings);
recursiveUpdate(settings, argv, false, true);

export const autoRepeat = async <F extends (...args: unknown[]) => Promise<unknown>>(functionToRun: F): Promise<void> => {
	const interval = settings.repeat.interval.split(":").map(s => parseInt(s));
	console.log(`\u001b[41mRepeating every ${interval[0]}H, ${interval[1]}m, ${interval[2]}s...\u001b[0m`);
	await functionToRun(); // Run
	const SECS = interval[2];
	const MINS = 60*interval[1];
	const HRS = 60*60*interval[0];
	let remaining = SECS+MINS+HRS;
	console.log(`${~~(remaining/60/60%60)}H, ${~~(remaining/60%60)}m, ${remaining%60}s until next check...`);
	setInterval(async () => {
		if (remaining === -1) return;
		remaining -= 10;
		if (remaining <= 0) {
			console.log("Checking for new videos...\n");
			remaining = -1;
			await functionToRun();
			remaining = SECS+MINS+HRS;
		} else console.log(`${~~(remaining/60/60%60)}H, ${~~(remaining/60%60)}m, ${remaining%60}s until next check...`);
	}, 10000);
};

export const fetchFFMPEG = (): Promise<void> => new Promise((resolve, reject) => {
	const platform = detectPlatform();
	if (fs.existsSync(`${settings.ffmpegPath}/${getBinaryFilename("ffmpeg", platform)}`) === false) {
		process.stdout.write("> Ffmpeg binary missing! Downloading... ");
		downloadBinaries("ffmpeg", {
			destination: settings.ffmpegPath,
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