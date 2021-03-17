import db from "@inrixia/db";
import Channel from "./Channel";

import type { SubscriptionSettings } from "./types";

import type { BlogPost } from "floatplane/creator";

type lastSeenVideo = {
	videoGUID: BlogPost["guid"];
	releaseDate: BlogPost["releaseDate"];
}
type SubscriptionDB = {
	lastSeenVideo: lastSeenVideo
}


export default class Subscription {
	private _channels: Channel[];
	private _defaultChannel: Channel;

	public creatorId: string;

	private _db: SubscriptionDB;
	constructor(subscription: SubscriptionSettings) {
		this.creatorId = subscription.creatorId;
		
		this._channels = Object.values(subscription.channels).map(channel => new Channel(channel, this));
		this._defaultChannel = new Channel(subscription.channels._default, this);

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
	public addVideo = (video: BlogPost): (ReturnType<Channel["addVideo"]> | null) => {
		for (const channel of this._channels) {
			// Check if the video belongs to this channel
			if (channel.identifiers === false) continue;
			for (const identifier of channel.identifiers) {
				if (typeof video[identifier.type] !== "string") throw new Error(`Video value for channel identifier type ${video[identifier.type]} on channel ${channel.title} is of type ${typeof video[identifier.type]} not string!`);
				else if ((video[identifier.type] as string).toLowerCase().indexOf(identifier.check.toLowerCase()) !== -1) {
					if (channel.skip === true) return null;
					// Remove the identifier from the video title if to give a nicer title
					if (identifier.type === "title") video.title = video.title.replace(identifier.check, "").trim();
					return channel.addVideo(video);
				}
			}
		}
		if (this._defaultChannel.skip === true) return null;
		else return this._defaultChannel.addVideo(video);
	}
}