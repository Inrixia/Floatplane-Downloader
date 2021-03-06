import db from "@inrixia/db";

import type { Settings, ChannelAliases, SubChannels } from "./types";
import { defaultSettings, defaultSubChannels, defaultChannelAliases } from "./defaults";

export const settings = db<Settings>("./config/settings.json", defaultSettings, { pretty: true });
export const readOnlySettings = settings as Readonly<Settings>;

type UnknownObject = { [key: string]: unknown };
const mergeObject = (priorityKeep: UnknownObject, overwriteFrom: UnknownObject): void => {
	for (const [key, value] of Object.entries(overwriteFrom)) {
		priorityKeep[key] = value;
	}
};

export const channelAliases = db<ChannelAliases>("./config/channelAliases.json", defaultChannelAliases, { forceCreate: true, pretty: true }) as Readonly<ChannelAliases>;
mergeObject(channelAliases, defaultChannelAliases);
export const subChannels = db<SubChannels>("./config/subChannels.json", defaultSubChannels, { forceCreate: true, pretty: true }) as Readonly<SubChannels>;
mergeObject(subChannels, defaultSubChannels);

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