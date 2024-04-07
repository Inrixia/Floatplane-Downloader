import { getEnv, rebuildTypes, recursiveUpdate } from "@inrixia/helpers/object";
import { defaultArgs, defaultSettings } from "../defaults.js";
import { Histogram } from "prom-client";
import db from "@inrixia/db";

import { defaultImport } from "default-import";

import _ARGV from "process.argv";
const ARGV = defaultImport(_ARGV);

import "dotenv/config";

import json5 from "json5";
const { parse } = json5;

export const DownloaderVersion = "5.13.0";

import type { PartialArgs, Settings } from "../types.js";

import { FileCookieStore } from "tough-cookie-file-store";
import { CookieJar } from "tough-cookie";
export const cookieJar = new CookieJar(new FileCookieStore("./db/cookies.json"));

import { Floatplane } from "floatplane";
export const fApi = new Floatplane(
	cookieJar,
	`Floatplane-Downloader/${DownloaderVersion} (Inrix, +https://github.com/Inrixia/Floatplane-Downloader), CFNetwork`,
);

// Add floatplane api request metrics
const httpRequestDurationmMs = new Histogram({
	name: "request_duration_ms",
	help: "Duration of HTTP requests in ms",
	labelNames: ["method", "hostname", "pathname", "status"],
	buckets: [1, 10, 50, 100, 250, 500],
});
type WithStartTime<T> = T & { _startTime: number };
fApi.extend({
	hooks: {
		beforeRequest: [
			(options) => {
				(<WithStartTime<typeof options>>options)._startTime = Date.now();
			},
		],
		afterResponse: [
			(res) => {
				const url = res.requestUrl;
				const options = <WithStartTime<typeof res.request.options>>res.request.options;
				const thumbsIndex = url.pathname.indexOf("thumbnails");
				const pathname = thumbsIndex !== -1 ? url.pathname.substring(0, thumbsIndex + 10) : url.pathname;
				httpRequestDurationmMs.observe({ method: options.method, hostname: url.hostname, pathname, status: res.statusCode }, Date.now() - options._startTime);
				return res;
			},
		],
	},
});

export const settings = db<Settings>("./db/settings.json", { template: defaultSettings, pretty: true, forceCreate: true, updateOnExternalChanges: true });
recursiveUpdate(settings, defaultSettings);

const argv = ARGV(process.argv.slice(2))<PartialArgs>({});
rebuildTypes(argv, { ...defaultSettings, ...defaultArgs });
recursiveUpdate(settings, argv, { setUndefined: false, setDefined: true });

const env = getEnv();
rebuildTypes(env, { ...defaultSettings, ...defaultArgs });

if (env.__FPDSettings !== undefined) {
	if (typeof env.__FPDSettings !== "string") throw new Error("The __FPDSettings environment variable cannot be parsed!");
	recursiveUpdate(settings, parse(env.__FPDSettings.replaceAll('\\"', '"')), { setUndefined: false, setDefined: true });
}

recursiveUpdate(settings, env, { setUndefined: false, setDefined: true });

export const args = { ...argv, ...env };

// eslint-disable-next-line no-control-regex
const headlessStdoutRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
// Override stdout if headless to not include formatting tags
if (args.headless === true) {
	const originalStdoutWrite = process.stdout.write.bind(process.stdout);
	type StdoutArgs = Parameters<typeof process.stdout.write>;

	process.stdout.write = ((...params: StdoutArgs) => {
		// eslint-disable-next-line no-control-regex
		if (typeof params[0] === "string") params[0] = `[${new Date().toLocaleString()}] ${params[0].replace(headlessStdoutRegex, "")}`;
		return originalStdoutWrite(...params);
	}) as typeof process.stdout.write;
}
