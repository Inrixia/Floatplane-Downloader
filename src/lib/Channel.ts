import db from "@inrixia/db";
import Video from "./Video";

import type { Video as fApiVideo } from "floatplane/creator";
import type { ChannelOptions } from "./types"

// e = episodeNo, d = downloaded, p = progress (download progress if previously started downloading)
export type VideoDBEntry = { e: number, d: boolean, f?: string }
export type ChannelDB = {
	videos: { [key: string]: VideoDBEntry },
	episodeNo: number
}

export default class Channel {
	public title: ChannelOptions["title"];
	public creator: ChannelOptions["creator"];
	public identifier: ChannelOptions["identifier"];
	public skip: ChannelOptions["skip"];

	private _db: ChannelDB;
	/**
	 * Returns a channel built from a subscription.
	 * @param {ChannelOptions} channel
	 */
	constructor(channel: ChannelOptions) {
		this.title = channel.title;
		this.creator = channel.creator;
		this.identifier = channel.identifier;
		this.skip = channel.skip;
		this._db = db<ChannelDB>(`./db/channels/${channel.creator}/${channel.title}.json`, { videos: {}, episodeNo: 1 });
	}

	addVideo(video: fApiVideo) {
		// Set the episode number
		this._db.videos[video.guid] ??= { e: this._db.episodeNo++, d: false };
		return new Video(video, this.title, this._db.videos[video.guid]);
	}
}