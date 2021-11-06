import { BlogPost } from 'floatplane/creator';
import { fApi } from './FloatplaneAPI';
import Channel from './Channel';
import db from '@inrixia/db';

import type { SubscriptionSettings } from './types';
import type Video from './Video';

type LastSeenVideo = {
	guid: BlogPost['guid'];
	releaseDate: BlogPost['releaseDate'];
};
type SubscriptionDB = {
	lastSeenVideo: LastSeenVideo;
	videos: BlogPost[];
};

export default class Subscription {
	public channels: Channel[];
	public defaultChannel: Channel;

	public creatorId: string;

	private _db: SubscriptionDB;
	constructor(subscription: SubscriptionSettings) {
		this.creatorId = subscription.creatorId;

		this.channels = Object.values(subscription.channels).map((channel) => new Channel(channel, this));
		this.defaultChannel = new Channel(subscription.channels._default, this);

		// Load/Create database
		const databaseFilePath = `./db/subscriptions/${subscription.creatorId}.json`;
		try {
			this._db = db<SubscriptionDB>(databaseFilePath, { template: { lastSeenVideo: { guid: '', releaseDate: '' }, videos: [] } });
		} catch {
			throw new Error(`Cannot load Subscription database file ${databaseFilePath}! Please delete the file or fix it!`);
		}
	}

	get lastSeenVideo(): SubscriptionDB['lastSeenVideo'] {
		return this._db.lastSeenVideo;
	}

	public updateLastSeenVideo(videoSeen: LastSeenVideo): void {
		if (this.lastSeenVideo.releaseDate === '' || new Date(videoSeen.releaseDate) > new Date(this.lastSeenVideo.releaseDate)) this._db.lastSeenVideo = videoSeen;
	}

	/**
	 * @param {fApiVideo} video
	 */
	public addVideo(video: BlogPost, overrideSkip: true, stripSubchannelPrefix?: boolean): ReturnType<Channel['addVideo']>;
	public addVideo(video: BlogPost, overrideSkip?: false, stripSubchannelPrefix?: boolean): ReturnType<Channel['addVideo']> | null;

	public addVideo(video: BlogPost, overrideSkip = false, stripSubchannelPrefix = true): ReturnType<Channel['addVideo']> | null {
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

					if ((video[identifierType] as string).toLowerCase().indexOf(identifier.check.toLowerCase()) !== -1) {
						if (overrideSkip === false && channel.skip === true) return null;
						// Remove the identifier from the video title if to give a nicer title
						const idCheck = identifier.check.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
						const regIDCheck = new RegExp(idCheck, 'i');
						if (identifierType === 'title' && stripSubchannelPrefix === true) video.title = video.title.replace(regIDCheck, '').trim();
						return channel.addVideo(video);
					}
				}
			}
		}
		if (overrideSkip === false && this.defaultChannel.skip === true) return null;
		return this.defaultChannel.addVideo(video);
	}

	public async fetchNewVideos(videosToSearch = 20, stripSubchannelPrefix: boolean, ignoreBeforeTimestamp: number | false): Promise<Array<Video>> {
		const coloredTitle = `${this.defaultChannel.consoleColor || '\u001b[38;5;208m'}${this.defaultChannel.title}\u001b[0m`;

		const videos = [];

		process.stdout.write(`> Fetching latest videos from [${coloredTitle}]... Fetched ${videos.length} videos!`);

		for await (const video of fApi.creator.blogPostsIterable(this.creatorId, { type: 'video' })) {
			if (video.guid === this.lastSeenVideo.guid) {
				if (!(await this.addVideo(video, true, stripSubchannelPrefix).isDownloaded())) this.lastSeenVideo.guid = '';
				else break;
			}
			if (this.lastSeenVideo.guid === '' && videos.length >= videosToSearch) break;
			videos.push(video);
			process.stdout.write(`\r> Fetching latest videos from [${coloredTitle}]... Fetched ${videos.length} videos!`);
		}

		// Make sure videos are in correct order for episode numbering, null episodes are part of a channel that is marked to be skipped
		const incompleteVideos: Video[] = [];
		for (const video of videos
			.sort((a, b) => +new Date(a.releaseDate) - +new Date(b.releaseDate))
			.map((video) => this.addVideo(video, false, stripSubchannelPrefix))) {
			if (video === null || (await video.isMuxed())) continue;
			if (ignoreBeforeTimestamp !== false && new Date(video.releaseDate).getTime() < ignoreBeforeTimestamp) continue;
			incompleteVideos.push(video);
		}
		process.stdout.write(` Skipped ${videos.length - incompleteVideos.length}.\n`);
		return incompleteVideos;
	}
}
