import { fApi } from "./helpers.js";

import chalk from "chalk";
import { rm } from "fs/promises";

import type { ChannelOptions, SubscriptionSettings } from "./types.js";
import type { ContentPost } from "floatplane/content";
import type { BlogPost } from "floatplane/creator";

import { Video } from "./Video.js";

import { settings } from "./helpers.js";

const removeRepeatedSentences = (postTitle: string, attachmentTitle: string) => {
	const separators = /(?:\s+|^)((?:[^.,;:!?-]+[\s]*[.,;:!?-]+)+)(?:\s+|$)/g;
	const postTitleSentences = postTitle.match(separators)?.map((sentence) => sentence.trim());
	const attachmentTitleSentences = attachmentTitle.match(separators)?.map((sentence) => sentence.trim());

	const uniqueAttachmentTitleSentences = attachmentTitleSentences?.filter((sentence) => !postTitleSentences?.includes(sentence));

	if (uniqueAttachmentTitleSentences === undefined) return `${postTitle.trim()} - ${attachmentTitle.trim()}`.trim();

	// Remove trailing separator
	return `${postTitle.trim()} - ${uniqueAttachmentTitleSentences.join("").trim()}`.trim().replace(/[\s]*[.,;:!?-]+[\s]*$/, "");
};

export default class Subscription {
	public channels: SubscriptionSettings["channels"];

	public readonly creatorId: string;

	constructor(subscription: SubscriptionSettings) {
		this.creatorId = subscription.creatorId;

		this.channels = subscription.channels;
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

				for (const video of Video.GetChannelVideos((video) => video.releaseDate < ignoreBeforeTimestamp && video.channelTitle === channel.title)) {
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

	private async *matchChannel(blogPost: BlogPost): AsyncGenerator<Video> {
		if (blogPost.videoAttachments === undefined) return;
		let dateOffset = 0;
		for (const attachment of blogPost.videoAttachments.sort((a, b) => blogPost.attachmentOrder.indexOf(a) - blogPost.attachmentOrder.indexOf(b))) {
			// Make sure we have a unique object for each attachment
			const post = { ...blogPost };
			if (blogPost.videoAttachments.length > 1) {
				dateOffset++;
				const { title: attachmentTitle } = await fApi.content.video(attachment);
				post.title = removeRepeatedSentences(post.title, attachmentTitle);
			}

			channelLoop: for (const channel of this.channels) {
				if (!channel.identifiers) continue;
				for (const identifier of channel.identifiers) {
					if (typeof identifier.type !== "string")
						throw new Error(
							`Value for channel identifier type ${post[identifier.type]} on channel ${channel.title} is of type ${typeof post[identifier.type]} not string!`,
						);

					let nextChannel = false;
					switch (identifier.type) {
						case "channelId":
							nextChannel = (typeof post.channel !== "string" ? post.channel.id : post.channel) !== identifier.check;
							break;
						case "runtimeLessThan":
							nextChannel = post.metadata.videoDuration >= +identifier.check;
							break;
						case "runtimeGreaterThan":
							nextChannel = post.metadata.videoDuration <= +identifier.check;
							break;
						case "releasedBefore":
							nextChannel = post.releaseDate >= identifier.check;
							break;
						case "releasedAfter":
							nextChannel = post.releaseDate <= identifier.check;
							break;
						case "description":
							nextChannel = post.text?.toString().toLowerCase().includes(identifier.check.toLowerCase());
							break;
						default:
							nextChannel = !post[identifier.type]?.toString().toLowerCase().includes(identifier.check.toLowerCase()) || false;
					}

					if (nextChannel) continue;
					if (channel.skip) return;

					if (channel.daysToKeepVideos !== undefined && new Date(post.releaseDate).getTime() < Subscription.getIgnoreBeforeTimestamp(channel)) return;

					// Remove the identifier from the video title if to give a nicer title
					if (settings.extras.stripSubchannelPrefix === true && (identifier.type === "title" || identifier.type === "channelId")) {
						const replacers = [
							new RegExp(identifier.check.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "i"),
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
					yield new Video(post, attachment, channel.title, dateOffset * 1000);
					break channelLoop;
				}
			}
		}
	}

	public async *fetchNewVideos(): AsyncGenerator<Video> {
		if (settings.floatplane.videosToSearch === 0) return;
		let videosSearched = 0;
		for await (const blogPost of fApi.creator.blogPostsIterable(this.creatorId, { hasVideo: true })) {
			for await (const video of this.matchChannel(blogPost)) yield video;

			// Stop searching if we have looked through videosToSearch
			if (videosSearched++ >= settings.floatplane.videosToSearch) break;
		}
	}

	public async *seekAndDestroy(contentPosts: ContentPost[]): AsyncGenerator<Video> {
		const thisSubsPosts = contentPosts.filter((post) => post.creator.id === this.creatorId);
		if (thisSubsPosts.length === 0) return;
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
			for await (const video of this.matchChannel(blogPost)) yield video;
		}
	}
}
