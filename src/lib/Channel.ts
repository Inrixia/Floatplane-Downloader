import fs from 'fs/promises';
import chalk from 'chalk';

import db from '@inrixia/db';
import Video from './Video';

import type { BlogPost } from 'floatplane/creator';
import type { ChannelOptions } from './types';
import type Subscription from './Subscription';

// e = episodeNo, d = downloaded, s = filesize in bytes, f = file
export type VideoDBEntry = { episodeNo: number; expectedSize?: number; filePath?: string; releaseDate: number };
export type ChannelDB = {
	videos: { [key: string]: VideoDBEntry };
	nextEpisodeNo: number;
};

export default class Channel {
	public readonly title: ChannelOptions['title'];
	public readonly identifiers: ChannelOptions['identifiers'];
	public readonly skip: ChannelOptions['skip'];
	public readonly daysToKeepVideos: ChannelOptions['daysToKeepVideos'];

	public readonly ignoreBeforeTimestamp: number;

	public readonly consoleColor: ChannelOptions['consoleColor'];

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
		this.consoleColor = channel.consoleColor;

		if (channel.daysToKeepVideos === undefined) channel.daysToKeepVideos = -1;
		this.daysToKeepVideos = channel.daysToKeepVideos;
		this.ignoreBeforeTimestamp = Date.now() - this.daysToKeepVideos * 24 * 60 * 60 * 1000;

		const databaseFilePath = `./db/channels/${subscription.creatorId}/${channel.title}.json`;
		try {
			this._db = db<ChannelDB>(databaseFilePath, { template: { videos: {}, nextEpisodeNo: 1 } });
		} catch {
			throw new Error(`Cannot load Channel database file ${databaseFilePath}! Please delete the file or fix it!`);
		}
	}

	public deleteOldVideos = async () => {
		if (this.daysToKeepVideos !== -1) {
			process.stdout.write(
				chalk`Checking for videos older than {cyanBright ${this.daysToKeepVideos}} days in channel {yellow ${this.title}} for {redBright deletion}...`
			);
			let deletedFiles = 0;
			let deletedVideos = 0;
			for (const video of Object.values(this._db.videos)) {
				if (video.releaseDate === undefined || video.filePath === undefined) continue;
				if (video.releaseDate < this.ignoreBeforeTimestamp) {
					deletedVideos++;
					const deletionResults = await Promise.allSettled([
						fs.rm(`${video.filePath}.mp4`),
						fs.rm(`${video.filePath}.partial`),
						fs.rm(`${video.filePath}.nfo`),
						fs.rm(`${video.filePath}.png`),
					]);
					for (const result of deletionResults) {
						if (result.status === 'fulfilled') deletedFiles++;
					}
				}
			}
			if (deletedFiles === 0) console.log(' No files found for deletion.');
			else console.log(chalk` Deleted {redBright ${deletedVideos}} videos, {redBright ${deletedFiles}} files.`);
		}
	};

	public lookupVideoDB = (guid: string): VideoDBEntry => this._db.videos[guid];

	public markVideoCompleted(guid: string, releaseDate: number): void {
		// Redundant check but worth keeping
		if (this.lookupVideoDB(guid) === undefined) throw new Error(`Cannot mark unknown video ${guid} as completed. Video does not exist in channel database.`);
		this.subscription.updateLastSeenVideo({ guid, releaseDate });
	}

	public addVideo(video: BlogPost): Video | null {
		const releaseDate = new Date(video.releaseDate).getTime();
		if (this.daysToKeepVideos !== -1 && releaseDate < this.ignoreBeforeTimestamp) return null;

		// Set db info, have to instigate the db first before setting filepath
		this._db.videos[video.guid] ??= { episodeNo: this._db.nextEpisodeNo++, releaseDate, filePath: '' };
		const videoInstance = new Video(video, this);
		this._db.videos[video.guid].filePath = videoInstance.filePath;

		return videoInstance;
	}
}
