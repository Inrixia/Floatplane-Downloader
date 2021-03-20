import db from "@inrixia/db";
import Video from "./Video";

import type { BlogPost } from "floatplane/creator";
import type { ChannelOptions } from "./types";
import type Subscription from "./Subscription";

// e = episodeNo, d = downloaded, s = filesize in bytes, f = file
export type VideoDBEntry = { episodeNo: number, expectedSize?: number }
export type ChannelDB = {
	videos: { [key: string]: VideoDBEntry },
	nextEpisodeNo: number
}

export default class Channel {
	public title: ChannelOptions["title"];
	public identifiers: ChannelOptions["identifiers"];
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
		this.identifiers = channel.identifiers;
		this.skip = channel.skip;
		const databaseFilePath = `./db/channels/${subscription.creatorId}/${channel.title}.json`;
		try {
			this._db = db<ChannelDB>(databaseFilePath, { videos: {}, nextEpisodeNo: 1 });
		} catch {
			throw new Error(`Cannot load Channel database file ${databaseFilePath}! Please delete the file or fix it!`);
		}
	}

	public lookupVideoDB = (videoGUID: string): VideoDBEntry => this._db.videos[videoGUID];

	public markVideoCompleted(videoGUID: string, releaseDate: string): void {
		// Redundant check but worth keeping
		if (this._db.videos[videoGUID] === undefined) throw new Error(`Cannot mark unknown video ${videoGUID} as completed. Video does not exist in channel database.`);
		this.subscription.updateLastSeenVideo({ videoGUID, releaseDate });
	}

	public addVideo (video: BlogPost): Video {
		// Set the episode number
		this._db.videos[video.guid] ??= { episodeNo: this._db.nextEpisodeNo++ };
		return new Video(video, this);
	}
}