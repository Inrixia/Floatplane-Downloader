import db from "@inrixia/db";

import { isObject } from "@inrixia/helpers/object";

import type { Settings } from "./types";
import { defaultSettings } from "./defaults";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const recursiveUpdate = (targetObject: any, newObject: any) => {
	if (!isObject(targetObject)) throw new Error("targetObject is not an object!");
	if (!isObject(newObject)) throw new Error("newObject is not an object!");
	for (const key in newObject) {
		if (targetObject[key] === undefined) targetObject[key] = newObject[key];
		else if (isObject(targetObject[key]) && isObject(newObject[key])) recursiveUpdate(targetObject[key], newObject[key]);
	}
};

export const settings = db<Settings>("./config/settings.json", defaultSettings, { pretty: true });
recursiveUpdate(settings, defaultSettings);

import type { Edge, EdgesResponse } from "floatplane/api";
import { getDistance } from "@inrixia/helpers/geo";
/**
 * Determine the edge closest to the client
 * @param {EdgesResponse} edgesResponse 
 */
export const findClosestEdge = (edgesResponse: EdgesResponse): Edge => edgesResponse.edges.filter(edge => edge.allowDownload).reduce((bestEdge, edge) => {
	const distanceToEdge = getDistance([edge.datacenter.latitude, edge.datacenter.longitude], [edgesResponse.client.latitude, edgesResponse.client.longitude]);
	const distanceToBestEdge = getDistance([bestEdge.datacenter.latitude, bestEdge.datacenter.longitude], [edgesResponse.client.latitude, edgesResponse.client.longitude]);
	if (distanceToEdge < distanceToBestEdge) return edge;
	else return bestEdge;
});

import { nPad } from "@inrixia/helpers/object";
export const autoRepeat = async <F extends (...args: unknown[]) => Promise<unknown>>(functionToRun: F): Promise<void> => {
	const interval = settings.repeat.interval.split(":").map(s => parseInt(s));
	console.log(`\u001b[41mRepeating every ${interval[0]}H, ${interval[1]}m, ${interval[2]}s...\u001b[0m`);
	await functionToRun(); // Run
	const SECS = interval[2];
	const MINS = 60*interval[1];
	const HRS = 60*60*interval[0];
	let remaining = SECS+MINS+HRS;
	setInterval(async () => {
		if (remaining === -1) return;
		remaining -= 10;
		if (remaining <= 0) {
			console.log("Auto restarting...\n");
			remaining = -1;
			await functionToRun();
			remaining = SECS+MINS+HRS;
		} else console.log(`${~~(remaining/60/60%60)}H, ${~~(remaining/60%60)}m, ${nPad(remaining%60)}s until restart...`);
	}, 10000);
};