import db from "@inrixia/db";

import type { Settings, ChannelAliases, SubChannels } from "./types"
import { defaultSettings, defaultSubChannels, defaultChannelAliases } from "./defaults";

export const writeableSettings = db<Settings>("./config/settings.json", defaultSettings);
export const settings = writeableSettings as Readonly<Settings>;

export const channelAliases = db<ChannelAliases>("./config/channelAliases.json", defaultChannelAliases) as Readonly<ChannelAliases>;
export const subChannels = db<SubChannels>("./config/subChannels.json", defaultSubChannels) as Readonly<SubChannels>;


import type { EdgesResponse } from "floatplane/api"
import { getDistance } from "@inrixia/helpers/geo";
/**
 * Determine the edge closest to the client
 * @param {EdgesResponse} edgesResponse 
 */
export const findClosestEdge = (edgesResponse: EdgesResponse) => edgesResponse.edges.filter(edge => edge.allowDownload).reduce((bestEdge, edge) => {
	const distanceToEdge = getDistance([edge.datacenter.latitude, edge.datacenter.longitude], [edgesResponse.client.latitude, edgesResponse.client.longitude]);
	const distanceToBestEdge = getDistance([bestEdge.datacenter.latitude, bestEdge.datacenter.longitude], [edgesResponse.client.latitude, edgesResponse.client.longitude]);
	if (distanceToEdge < distanceToBestEdge) return edge;
	else return bestEdge;
});

import { nPad } from "@inrixia/helpers/object"
export const autoRepeat = async (functionToRun: (...args: any[]) => Promise<unknown>) => {
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
}