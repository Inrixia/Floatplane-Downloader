import db from "@inrixia/db";

import { isObject } from "@inrixia/helpers/object";

import type { PartialArgs, Settings } from "./types";
import { defaultArgs, defaultSettings } from "./defaults";

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

/**
 * Converts process.env variables into a object
 * @example process.env["some_subproperty"] = "hello"
 * returns { some: { subProperty: "hello" } }
 */
const getEnv = () => {
	// Define our return object env variables are applied to.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const envObject = {} as Record<string, any>;
	// Iterate over env keys
	for (const envKey in process.env) {
		// Set our reference object to be equal to the envObject to begin with.
		let objRef = envObject;
		// Break apart the envKey into its keys. Ex some_subProperty = ["some", "subProperty"]
		const keys = envKey.split("_");
		// For every key except the last...
		for (let i = 0; i < keys.length-1; i++) {
			// Set the key on the objRef to a empty object if its undefined.
			objRef = objRef[keys[i]] ??= {};
		}
		// Set the last key to equal the original value
		if (typeof objRef === "object") objRef[keys[keys.length-1]] = process.env[envKey];
	}
	return envObject;
};

export const settings = db<Settings>("./db/settings.json", defaultSettings, { pretty: true });
recursiveUpdate(settings, defaultSettings);


const argv = rebuildTypes<PartialArgs, PartialArgs>(ARGV(process.argv.slice(2))<PartialArgs>({}), { ...defaultSettings, ...defaultArgs });
recursiveUpdate(settings, argv, false, true);

const env = rebuildTypes<PartialArgs, PartialArgs>(getEnv(), { ...defaultSettings, ...defaultArgs });
recursiveUpdate(settings, env, false, true);

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