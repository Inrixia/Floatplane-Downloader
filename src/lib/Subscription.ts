import db from "@inrixia/db";
import Channel from "./Channel";

import type { ChannelOptions } from "./types";

import type { Subscription as fApiSubscription } from "floatplane/user";
import type { Video as fApiVideo } from "floatplane/creator";

export type SubscriptionDB = {
	lastSeenVideo: fApiVideo["guid"];
}

export default class Subscription {
	public channels: Channel[];
	public ownChannel: Channel;

	private _db: SubscriptionDB;
	/**
	 * Returns a channel built from a subscription.
	 * @param {fApiSubscription} subscription
	 * @param {ChannelOptions[]} channels
	 */
	constructor(subscription: fApiSubscription, channels: ChannelOptions[] = []) {
		this.channels = channels.map(channel => new Channel(channel));
		this.ownChannel = new Channel({
			creatorId: subscription.creator,
			planTitle: subscription.plan.title,
			skip: false,
			identifier: { check: "", type: "title" }
		});
		this._db = db<SubscriptionDB>(`./db/subscriptions/${subscription.creator}.json`, { lastSeenVideo: "" });
	}

	get lastSeenVideo() {
		return this._db.lastSeenVideo;
	}

	/**
	 * @param {fApiVideo} video
	 */
	addVideo(video: fApiVideo) {
		for (const channel of this.channels) {
			// Check if the video belongs to this channel
			if (video[channel.identifier.type].toLowerCase().indexOf(channel.identifier.check.toLowerCase()) > -1) {
				if (channel.skip === true) return null;
				return channel.addVideo(video);
			}
		}
		return this.ownChannel.addVideo(video);
	}
};
