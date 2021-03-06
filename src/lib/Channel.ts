import db from "@inrixia/db";
import Video from "./Video";

import type { Video as fApiVideo } from "floatplane/creator";
import type { ChannelOptions } from "./types";
import type Subscription from "./Subscription";

// e = episodeNo, d = downloaded, s = filesize in bytes, f = file
export type VideoDBEntry = { e: number, d: boolean, s?: number, f?: string }
export type ChannelDB = {
	videos: { [key: string]: VideoDBEntry },
	episodeNo: number
}

export default class Channel {
	public title: ChannelOptions["title"];
	public creator: ChannelOptions["creatorId"];
	public identifier: ChannelOptions["identifier"];
	public skip: ChannelOptions["skip"];

	public subscription: Subscription;

	public _db: ChannelDB;
	/**
	 * Returns a channel built from a subscription.
	 * @param {ChannelOptions} channel
	 */
	constructor(channel: ChannelOptions, subscription: Subscription) {
		this.subscription = subscription;

		this.title = channel.title;
		this.creator = channel.creatorId;
		this.identifier = channel.identifier;
		this.skip = channel.skip;
		const databaseFilePath = `./db/channels/${channel.creatorId}/${channel.title}.json`;
		try {
			this._db = db<ChannelDB>(databaseFilePath, { videos: {}, episodeNo: 1 });
		} catch {
			throw new Error(`Cannot load Channel database file ${databaseFilePath}! Please delete the file or fix it!`);
		}
	}

	public lookupVideoDB = (videoGUID: string): VideoDBEntry => this._db.videos[videoGUID];

	public markVideoDownloaded = (videoGUID: string, releaseDate: string): void => {
		// Redundant check but worth keeping
		if (this._db.videos[videoGUID] === undefined) throw new Error(`Cannot mark unknown video ${videoGUID} as downloaded. Video does not exist in channel database.`);
		this._db.videos[videoGUID].d = true;
		this.subscription.updateLastSeenVideo({ videoGUID, releaseDate });
	}

	public addVideo = (video: fApiVideo): Video => {
		// Set the episode number
		this._db.videos[video.guid] ??= { e: this._db.episodeNo++, d: false };
		return new Video(video, this);
	}
}