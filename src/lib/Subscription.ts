import { BlogPost } from 'floatplane/creator';
import { fApi } from './helpers.js';
import Channel from './Channel.js';
import db from '@inrixia/db';

import type { SubscriptionSettings } from './types.js';
import type Video from './Video.js';

type LastSeenVideo = {
	guid: BlogPost['guid'];
	releaseDate: number;
};
type SubscriptionDB = {
	lastSeenVideo: LastSeenVideo;
};

export default class Subscription {
	public channels: Channel[];
	public defaultChannel: Channel;

	public readonly creatorId: string;

	private _db: SubscriptionDB;
	constructor(subscription: SubscriptionSettings) {
		this.creatorId = subscription.creatorId;

		this.channels = Object.values(subscription.channels).map((channel) => new Channel(channel, this));
		this.defaultChannel = new Channel(subscription.channels._default, this);

		// Load/Create database
		const databaseFilePath = `./db/subscriptions/${subscription.creatorId}.json`;
		try {
			this._db = db<SubscriptionDB>(databaseFilePath, { template: { lastSeenVideo: { guid: '', releaseDate: 0 } } });
		} catch {
			throw new Error(`Cannot load Subscription database file ${databaseFilePath}! Please delete the file or fix it!`);
		}
	}

	get lastSeenVideo(): SubscriptionDB['lastSeenVideo'] {
		return this._db.lastSeenVideo;
	}

	public updateLastSeenVideo(videoSeen: LastSeenVideo): void {
		if (videoSeen.releaseDate > this.lastSeenVideo.releaseDate) this._db.lastSeenVideo = videoSeen;
	}

	public deleteOldVideos = async () => {
		for (const channel of this.channels) await channel.deleteOldVideos();
	};

	/**
	 * @param {fApiVideo} video
	 */
	public addVideo(video: BlogPost, stripSubchannelPrefix?: boolean): ReturnType<Channel['addVideo']>;
	public addVideo(video: BlogPost, stripSubchannelPrefix?: boolean): ReturnType<Channel['addVideo']> | null;
	public addVideo(video: BlogPost, stripSubchannelPrefix = true): ReturnType<Channel['addVideo']> | null {
		for (const channel of this.channels) {
			// Check if the video belongs to this channel
			if (channel.identifiers === false) continue;
			for (const identifier of channel.identifiers) {
				if (typeof identifier.type !== 'string')
					throw new Error(
						`Video value for channel identifier type ${video[identifier.type]} on channel ${channel.title} is of type ${typeof video[identifier.type]} not string!`
					);
				else {
					// Description is named text on videos, kept description for ease of use for users but have to change it here...
					const identifierType = identifier.type === 'description' ? 'text' : identifier.type;

					if ((video[identifierType] as string).toLowerCase().includes(identifier.check.toLowerCase())) {
						if (channel.skip === true) return null;
						// Remove the identifier from the video title if to give a nicer title
						const idCheck = identifier.check.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
						const regIDCheck = new RegExp(idCheck, 'i');
						if (identifierType === 'title' && stripSubchannelPrefix === true) video.title = video.title.replace(regIDCheck, '').trim();
						return channel.addVideo(video);
					}
				}
			}
		}
		if (this.defaultChannel.skip === true) return null;
		return this.defaultChannel.addVideo(video);
	}

	public async fetchNewVideos(videosToSearch = 20, stripSubchannelPrefix: boolean, forceFullSearch: boolean): Promise<Video[]> {
		const coloredTitle = `${this.defaultChannel.consoleColor || '\u001b[38;5;208m'}${this.defaultChannel.title}\u001b[0m`;

		const videos: Video[] = [];

		process.stdout.write(`> Fetching latest videos from [${coloredTitle}]... Fetched ${videos.length} videos!`);

		for await (const blogPost of fApi.creator.blogPostsIterable(this.creatorId, { hasVideo: true })) {
			const video = this.addVideo(blogPost, stripSubchannelPrefix);
			if (video === null) continue;
			// If we have found the last seen video, check if its downloaded.
			// If it is then break here and return the videos we have found.
			// Otherwise continue to fetch new videos up to the videosToSearch limit to ensure partially or non downloaded videos are returned.
			if (!forceFullSearch && video.guid === this.lastSeenVideo.guid && (await video.isDownloaded())) break;
			videos.push(video);
			// Stop searching if we have looked through videosToSearch
			if (videos.length >= videosToSearch) break;
			process.stdout.write(`\r> Fetching latest videos from [${coloredTitle}]... Fetched ${videos.length} videos!`);
		}
		process.stdout.write(` Skipped ${videos.length - videos.length}.\n`);
		return videos;
	}
}
