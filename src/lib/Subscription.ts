import db from "@inrixia/db";
import Channel from "./Channel";

import type { SubscriptionSettings } from "./types";

import type { Video as fApiVideo } from "floatplane/creator";

type lastSeenVideo = {
	videoGUID: fApiVideo["guid"];
	releaseDate: fApiVideo["releaseDate"];
}
type SubscriptionDB = {
	lastSeenVideo: lastSeenVideo
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
	constructor(subscription: SubscriptionSettings) {
		this.channels = subscription.channels.map(channel => new Channel(channel, this));
		this.ownChannel = new Channel({
			creatorId: subscription.creatorId,
			title: subscription.title,
			skip: false,
			identifier: { check: "", type: "title" }
		}, this);

		// Load/Create database
		const databaseFilePath = `./db/subscriptions/${subscription.creatorId}.json`;
		try {
			this._db = db<SubscriptionDB>(databaseFilePath, { lastSeenVideo: { videoGUID: "", releaseDate: "" } });
		} catch {
			throw new Error(`Cannot load Subscription database file ${databaseFilePath}! Please delete the file or fix it!`);
		}
	}

	get lastSeenVideo(): SubscriptionDB["lastSeenVideo"] {
		return this._db.lastSeenVideo;
	}

	public updateLastSeenVideo = (videoSeen: lastSeenVideo): void => {
		if (this.lastSeenVideo.releaseDate === "" || new Date(videoSeen.releaseDate) > new Date(this.lastSeenVideo.releaseDate)) this._db.lastSeenVideo = videoSeen;
	}

	/**
	 * @param {fApiVideo} video
	 */
	public addVideo = (video: fApiVideo): (ReturnType<Channel["addVideo"]> | null) => {
		for (const channel of this.channels) {
			// Check if the video belongs to this channel
			if (video[channel.identifier.type].toLowerCase().indexOf(channel.identifier.check.toLowerCase()) > -1) {
				if (channel.skip === true) return null;
				return channel.addVideo(video);
			}
		}
		return this.ownChannel.addVideo(video);
	}
}