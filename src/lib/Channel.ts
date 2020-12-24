import db from "@inrixia/db";
import Video from "./Video";

import type { Video as fApiVideo } from "floatplane/creator";
import type { ChannelOptions } from "./types";

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

	private _db: ChannelDB;
	/**
	 * Returns a channel built from a subscription.
	 * @param {ChannelOptions} channel
	 */
	constructor(channel: ChannelOptions) {
		this.title = channel.title;
		this.creator = channel.creatorId;
		this.identifier = channel.identifier;
		this.skip = channel.skip;
		this._db = db<ChannelDB>(`./db/channels/${channel.creatorId}/${channel.title}.json`, { videos: {}, episodeNo: 1 });
	}

	public addVideo = (video: fApiVideo): Video => {
		// Set the episode number
		this._db.videos[video.guid] ??= { e: this._db.episodeNo++, d: false };
		return new Video(video, this.title, this._db.videos[video.guid]);
	}
}