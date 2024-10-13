import { fApi } from "./helpers/index.js";

import chalk from "chalk-template";
import { rm } from "fs/promises";

import type { ChannelOptions, SubscriptionSettings } from "./types.js";
import type { ContentPost, VideoContent } from "floatplane/content";
import type { BlogPost } from "floatplane/creator";

import { settings } from "./helpers/index.js";
import { Video } from "./Video.js";

const removeRepeatedSentences = (postTitle: string, attachmentTitle: string) => {
	const separators = /(?:\s+|^)((?:[^.,;:!?-]+[\s]*[.,;:!?-]+)+)(?:\s+|$)/g;
	const postTitleSentences = postTitle.match(separators)?.map((sentence) => sentence.trim());
	const attachmentTitleSentences = attachmentTitle.match(separators)?.map((sentence) => sentence.trim());

	const uniqueAttachmentTitleSentences = attachmentTitleSentences?.filter((sentence) => !postTitleSentences?.includes(sentence));

	if (uniqueAttachmentTitleSentences === undefined) return `${postTitle.trim()} - ${attachmentTitle.trim()}`.trim();

	// Remove trailing separator
	return `${postTitle.trim()} - ${uniqueAttachmentTitleSentences.join("").trim()}`.trim().replace(/[\s]*[.,;:!?-]+[\s]*$/, "");
};

type isChannel = (post: BlogPost, video?: VideoContent) => boolean;
export default class Subscription {
	public readonly creatorId: string;
	public readonly channels: SubscriptionSettings["channels"];
	public readonly plan: string;

	constructor(subscription: SubscriptionSettings) {
		this.creatorId = subscription.creatorId;
		this.channels = subscription.channels;
		this.plan = subscription.plan;
	}

	public deleteOldVideos = async () => {
		for (const channel of this.channels) {
			if (channel.daysToKeepVideos !== undefined) {
				const ignoreBeforeTimestamp = Subscription.getIgnoreBeforeTimestamp(channel);
				process.stdout.write(
					chalk`Checking for videos older than {cyanBright ${channel.daysToKeepVideos}} days in channel {yellow ${channel.title}} for {redBright deletion}...`,
				);
				let deletedFiles = 0;
				let deletedVideos = 0;

				for (const video of Video.find((video) => video.releaseDate < ignoreBeforeTimestamp && video.videoTitle === channel.title)) {
					deletedVideos++;
					const deletionResults = await Promise.allSettled([
						rm(`${video.filePath}.mp4`),
						rm(`${video.filePath}.partial`),
						rm(`${video.filePath}.nfo`),
						rm(`${video.filePath}.png`),
					]);
					for (const result of deletionResults) {
						if (result.status === "fulfilled") deletedFiles++;
					}
				}
				if (deletedFiles === 0) console.log(" No files found for deletion.");
				else console.log(chalk` Deleted {redBright ${deletedVideos}} videos, {redBright ${deletedFiles}} files.`);
			}
		}
	};

	private static getIgnoreBeforeTimestamp = (channel: ChannelOptions) => Date.now() - (channel.daysToKeepVideos ?? 0) * 24 * 60 * 60 * 1000;
	private static isChannelCache: Record<string, isChannel> = {};
	private static isChannelHelper = `const isChannel = (post, channelId) => (typeof post.channel !== 'string' ? post.channel.id : post.channel) === channelId`;

	private async *matchChannel(blogPost: BlogPost): AsyncGenerator<Video> {
		if (blogPost.videoAttachments === undefined) return;
		let dateOffset = 0;
		for (const attachmentId of blogPost.videoAttachments.sort((a, b) => blogPost.attachmentOrder.indexOf(a) - blogPost.attachmentOrder.indexOf(b))) {
			// Make sure we have a unique object for each attachment
			const post = { ...blogPost };
			let video: VideoContent | undefined = undefined;
			if (blogPost.videoAttachments.length > 1) {
				dateOffset++;
				video = await fApi.content.video(attachmentId);
				// Skip videos with no levels
				if (video.levels.length === 0) continue;
				post.title = removeRepeatedSentences(post.title, video.title);
			}

			for (const channel of this.channels) {
				if (channel.isChannel === undefined) continue;
				const isChannel =
					Subscription.isChannelCache[channel.isChannel] ??
					(Subscription.isChannelCache[channel.isChannel] = new Function(`${Subscription.isChannelHelper};return ${channel.isChannel};`)() as isChannel);

				if (!isChannel(post, video)) continue;
				if (channel.skip) break;
				if (channel.daysToKeepVideos !== undefined && new Date(post.releaseDate).getTime() < Subscription.getIgnoreBeforeTimestamp(channel)) return;

				// Remove the identifier from the video title if to give a nicer title
				if (settings.extras.stripSubchannelPrefix === true) {
					const replacers = [
						new RegExp(channel.title.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "i"),
						/MA: /i,
						/FP Exclusive: /i,
						/talklinked/i,
						/TL: /i,
						/TL Short: /i,
						/TQ: /i,
						/TJM: /i,
						/SC: /i,
						/CSF: /i,
						/Livestream VOD – /i,
						/ : /i,
					];
					for (const regIdCheck of replacers) {
						post.title = post.title.replace(regIdCheck, "");
					}

					post.title = post.title.replaceAll("  ", " ");
					if (post.title.startsWith(": ")) post.title = post.title.replace(": ", "");

					post.title = post.title.trim();
				}
				yield Video.getOrCreate({
					attachmentId,
					description: post.text,
					artworkUrl: post.thumbnail?.path,
					channelTitle: channel.title,
					videoTitle: post.title,
					releaseDate: new Date(new Date(post.releaseDate).getTime() + dateOffset * 1000),
				});
				break;
			}
		}
	}

	public async *fetchNewVideos(): AsyncGenerator<Video> {
		if (settings.floatplane.videosToSearch === 0) return;
		let videosSearched = 0;
		console.log(chalk`Searching for new videos in {yellow ${this.plan}}`);
		for await (const blogPost of fApi.creator.blogPostsIterable(this.creatorId)) {
			for await (const video of this.matchChannel(blogPost)) {
				yield video;
			}

			// Stop searching if we have looked through videosToSearch
			if (videosSearched++ >= settings.floatplane.videosToSearch) break;
		}
	}

	public async *seekAndDestroy(contentPost: ContentPost): AsyncGenerator<Video> {
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
		for await (const video of this.matchChannel(blogPost)) yield video;
	}
}
