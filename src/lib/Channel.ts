import fs from "fs/promises";
import db from "@inrixia/db";
import Video from "./Video.js";
import chalk from "chalk-template";

import type { BlogPost } from "floatplane/creator";
import type { ChannelOptions } from "./types.js";
import type Subscription from "./Subscription.js";

export type VideoDBEntry = { expectedSize?: number; filePath?: string; releaseDate: number };
export type ChannelDB = {
	videos: { [key: string]: VideoDBEntry };
};

export default class Channel {
	public readonly title: ChannelOptions["title"];
	public readonly identifiers: ChannelOptions["identifiers"];
	public readonly skip: ChannelOptions["skip"];
	public readonly daysToKeepVideos?: ChannelOptions["daysToKeepVideos"];

	public readonly ignoreBeforeTimestamp?: number;

	public subscription: Subscription;

	private readonly _db: ChannelDB;
	/**
	 * Returns a channel built from a subscription.
	 * @param {ChannelOptions} channel
	 */
	constructor(channel: ChannelOptions, subscription: Subscription) {
		this.subscription = subscription;

		this.title = channel.title;
		this.identifiers = channel.identifiers;
		this.skip = channel.skip;

		if (channel.daysToKeepVideos !== undefined) {
			this.daysToKeepVideos = channel.daysToKeepVideos;
			this.ignoreBeforeTimestamp = Date.now() - this.daysToKeepVideos * 24 * 60 * 60 * 1000;
		}

		const databaseFilePath = `./db/channels/${subscription.creatorId}/${channel.title}.json`;
		try {
			this._db = db<ChannelDB>(databaseFilePath, { template: { videos: {} } });
		} catch {
			throw new Error(`Cannot load Channel database file ${databaseFilePath}! Please delete the file or fix it!`);
		}
	}

	public deleteOldVideos = async () => {
		if (this.daysToKeepVideos !== undefined) {
			process.stdout.write(
				chalk`Checking for videos older than {cyanBright ${this.daysToKeepVideos}} days in channel {yellow ${this.title}} for {redBright deletion}...`
			);
			let deletedFiles = 0;
			let deletedVideos = 0;
			for (const video of Object.values(this._db.videos)) {
				if (video.releaseDate === undefined || video.filePath === undefined) continue;
				if (this.ignoreBeforeTimestamp !== undefined && video.releaseDate < this.ignoreBeforeTimestamp) {
					deletedVideos++;
					const deletionResults = await Promise.allSettled([
						fs.rm(`${video.filePath}.mp4`),
						fs.rm(`${video.filePath}.partial`),
						fs.rm(`${video.filePath}.nfo`),
						fs.rm(`${video.filePath}.png`),
					]);
					for (const result of deletionResults) {
						if (result.status === "fulfilled") deletedFiles++;
					}
				}
			}
			if (deletedFiles === 0) console.log(" No files found for deletion.");
			else console.log(chalk` Deleted {redBright ${deletedVideos}} videos, {redBright ${deletedFiles}} files.`);
		}
	};

	public markVideoFinished(guid: string, releaseDate: number): void {
		// Redundant check but worth keeping
		if (this._db.videos[guid] === undefined) throw new Error(`Cannot mark unknown video ${guid} as completed. Video does not exist in channel database.`);
		this.subscription.updateLastSeenVideo({ guid, releaseDate });
	}

	public addVideo(video: BlogPost): Video | null {
		const releaseDate = new Date(video.releaseDate).getTime();
		if (this.ignoreBeforeTimestamp !== undefined && releaseDate < this.ignoreBeforeTimestamp) return null;

		// Set db info, have to instigate the db first before setting filepath
		if (this._db.videos[video.guid] === undefined) {
			this._db.videos[video.guid] ??= {
				releaseDate,
				filePath: "",
			};
		}
		const videoInstance = new Video(video, this, this._db.videos[video.guid]);
		this._db.videos[video.guid].filePath = videoInstance.fullPath;

		return videoInstance;
	}
}
