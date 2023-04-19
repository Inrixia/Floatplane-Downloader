import { fApi } from "./helpers.js";
import Channel from "./Channel.js";
import db from "@inrixia/db";

import type { SubscriptionSettings } from "./types.js";
import type Video from "./Video.js";
import type { ContentPost } from "floatplane/content";
import type { BlogPost } from "floatplane/creator";

type LastSeenVideo = {
	guid: BlogPost["guid"];
	releaseDate: number;
};
type SubscriptionDB = {
	lastSeenVideo: LastSeenVideo;
};

export default class Subscription {
	public channels: Channel[];

	public readonly creatorId: string;
	private readonly plan: string;

	private _db: SubscriptionDB;
	constructor(subscription: SubscriptionSettings) {
		this.creatorId = subscription.creatorId;
		this.plan = subscription.plan;

		this.channels = subscription.channels.map((channel) => new Channel(channel, this));

		// Load/Create database
		const databaseFilePath = `./db/subscriptions/${subscription.creatorId}.json`;
		try {
			this._db = db<SubscriptionDB>(databaseFilePath, { template: { lastSeenVideo: { guid: "", releaseDate: 0 } } });
		} catch {
			throw new Error(`Cannot load Subscription database file ${databaseFilePath}! Please delete the file or fix it!`);
		}
	}

	get lastSeenVideo(): SubscriptionDB["lastSeenVideo"] {
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
	public addVideo(video: BlogPost, stripSubchannelPrefix?: boolean): ReturnType<Channel["addVideo"]>;
	public addVideo(video: BlogPost, stripSubchannelPrefix?: boolean): ReturnType<Channel["addVideo"]> | null;
	public addVideo(video: BlogPost, stripSubchannelPrefix = true): ReturnType<Channel["addVideo"]> | null {
		for (const channel of this.channels) {
			if (!channel.identifiers) continue;
			for (const identifier of channel.identifiers) {
				if (typeof identifier.type !== "string")
					throw new Error(
						`Value for channel identifier type ${video[identifier.type]} on channel ${channel.title} is of type ${typeof video[identifier.type]} not string!`
					);
				else {
					if (identifier.type === "channelId" && video.channel.id === identifier.check) {
						if (channel.skip === true) return null;
						return channel.addVideo(video);
					}
					if (
						(identifier.type === "runtimeLessThan" && video.metadata.videoDuration < +identifier.check) ||
						(identifier.type === "runtimeGreaterThan" && video.metadata.videoDuration > +identifier.check)
					) {
						if (channel.skip === true) return null;
						return channel.addVideo(video);
					}
					if (
						(identifier.type === "releasedBefore" && video.releaseDate < +identifier.check) ||
						(identifier.type === "releasedAfter" && video.releaseDate > +identifier.check)
					) {
						if (channel.skip === true) return null;
						return channel.addVideo(video);
					}

					// Description is named text on videos, kept description for ease of use for users but have to change it here...
					const identifierType = identifier.type === "description" ? "text" : identifier.type;
					if (identifierType in video && video[identifierType as keyof typeof video]?.toString().toLowerCase().includes(identifier.check.toLowerCase())) {
						if (channel.skip === true) return null;
						// Remove the identifier from the video title if to give a nicer title
						const idCheck = identifier.check.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
						const regIDCheck = new RegExp(idCheck, "i");
						if (identifierType === "title" && stripSubchannelPrefix === true) video.title = video.title.replace(regIDCheck, "").trim();
						return channel.addVideo(video);
					}
				}
			}
		}
		throw new Error(`Video ${video.title} could not be matched to a channel!`);
	}

	public async fetchNewVideos(videosToSearch = 20, stripSubchannelPrefix: boolean, forceFullSearch: boolean): Promise<Video[]> {
		const videos: Video[] = [];

		process.stdout.write(`> Fetching latest videos from [${this.plan}]... Fetched ${videos.length} videos!`);

		let videosSearched = 0;
		if (videosToSearch > 0)
			for await (const blogPost of fApi.creator.blogPostsIterable(this.creatorId, { hasVideo: true })) {
				const video = this.addVideo(blogPost, stripSubchannelPrefix);
				if (video !== null) {
					// If we have found the last seen video, check if its downloaded.
					// If it is then break here and return the videos we have found.
					// Otherwise continue to fetch new videos up to the videosToSearch limit to ensure partially or non downloaded videos are returned.
					if (!forceFullSearch && video.guid === this.lastSeenVideo.guid && (await video.isDownloaded())) break;
					videos.push(video);
				}
				// Stop searching if we have looked through videosToSearch
				if (videosSearched++ >= videosToSearch) break;
				process.stdout.write(`\r> Fetching latest videos from [${this.plan}]... Fetched ${videos.length} videos!`);
			}
		process.stdout.write(` Skipped ${videosSearched - videos.length}.\n`);
		return videos;
	}

	public async seekAndDestroy(contentPosts: ContentPost[], stripSubchannelPrefix: boolean): Promise<Video[]> {
		const thisSubsPosts = contentPosts.filter((post) => post.creator.id === this.creatorId);
		if (thisSubsPosts.length === 0) return [];
		process.stdout.write(`> Seeking and destroying ${thisSubsPosts.length} videos... Destroyed 0`);
		let count = 0;
		const videos: Video[] = [];
		for (const contentPost of thisSubsPosts) {
			// Convert as best able to a BlogPost
			const blogPost: BlogPost = <BlogPost>(<unknown>{
				...contentPost,
				videoAttachments: contentPost.videoAttachments === undefined ? undefined : contentPost.videoAttachments.map((att) => att.id),
				audioAttachments: contentPost.audioAttachments === undefined ? undefined : contentPost.audioAttachments.map((att) => att.id),
				pictureAttachments: contentPost.pictureAttachments === undefined ? undefined : contentPost.pictureAttachments.map((att) => att.id),
				creator: {
					...contentPost.creator,
					owner: {
						id: contentPost.creator.owner,
						username: "",
					},
					category: {
						title: contentPost.creator.category,
					},
					card: null,
				},
			});
			const video = this.addVideo(blogPost, stripSubchannelPrefix);
			if (video === null) continue;
			videos.push(video);
			process.stdout.write(`\r> Seeking and destroying ${thisSubsPosts.length} videos... Destroyed ${++count}`);
		}
		console.log();
		return videos;
	}
}
