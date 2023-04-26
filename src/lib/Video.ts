import { exec as execCallback, execFile } from "child_process";
import { createWriteStream } from "fs";
import { promisify } from "util";
import fs from "fs/promises";
import { constants } from "fs";
import { settings, fApi } from "./helpers.js";

const exec = promisify(execCallback);

import { htmlToText } from "html-to-text";
import sanitize from "sanitize-filename";
import builder from "xmlbuilder";

import { nPad } from "@inrixia/helpers/math";

import type { BlogPost } from "floatplane/creator";
import type { DeliveryResponse } from "floatplane/cdn";
import type { ValueOfA } from "@inrixia/helpers/ts";
import db from "@inrixia/db";

const fileExists = async (path: string): Promise<boolean> => {
	try {
		await fs.access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
};

export enum VideoState {
	Missing,
	Partial,
	Muxed,
}

type Attachment = {
	partialSize?: number;
	muxedSize?: number;
	filePath: string;
	releaseDate: number;
	channelTitle: string;
};

export class Video {
	private description: BlogPost["text"];
	private releaseDate: Date;
	private thumbnail: BlogPost["thumbnail"];

	private attachmentId: string;

	public title: BlogPost["title"];
	public channelTitle: string;

	private static OriginSelector = 0;
	private originSelector = Video.OriginSelector;

	private static Attachments = db<Record<string, Attachment>>(`./db/attachments.json`);

	private folderPath: string;
	private filePath: string;

	private artworkPath: string;
	private nfoPath: string;
	private partialPath: string;
	private muxedPath: string;

	constructor(post: BlogPost, attachmentId: string, channelTitle: string) {
		this.channelTitle = channelTitle;
		this.title = post.title;
		this.attachmentId = attachmentId;

		this.description = post.text;
		this.releaseDate = new Date(post.releaseDate);
		this.thumbnail = post.thumbnail;

		this.filePath = this.formatString(settings.filePathFormatting)
			.split("/")
			.map((pathPart) => (pathPart.startsWith(".") ? pathPart : sanitize(pathPart)))
			.join("/");

		this.folderPath = this.filePath.substring(0, this.filePath.lastIndexOf("/"));

		this.artworkPath = `${this.filePath}${settings.artworkSuffix}.png`;
		this.nfoPath = `${this.filePath}.nfo`;
		this.partialPath = `${this.filePath}.partial`;
		this.muxedPath = `${this.filePath}.mp4`;
	}

	public static GetChannelVideos(filter: (video: Attachment) => boolean) {
		return Object.values(Video.Attachments).filter(filter);
	}

	public static FilePathOptions = ["%channelTitle%", "%year%", "%month%", "%day%", "%hour%", "%minute%", "%second%", "%videoTitle%"] as const;
	private formatString(string: string): string {
		const formatLookup: Record<ValueOfA<typeof Video.FilePathOptions>, string> = {
			"%channelTitle%": this.channelTitle,
			"%year%": this.releaseDate.getFullYear().toString(),
			"%month%": nPad(this.releaseDate.getMonth() + 1),
			"%day%": nPad(this.releaseDate.getDate()),
			"%hour%": nPad(this.releaseDate.getHours()),
			"%minute%": nPad(this.releaseDate.getMinutes()),
			"%second%": nPad(this.releaseDate.getSeconds()),
			"%videoTitle%": this.title.replace(/ - /g, " ").replace(/\//g, " ").replace(/\\/g, " "),
		};

		for (const [match, value] of Object.entries(formatLookup)) {
			string = string.replace(new RegExp(match, "g"), value);
		}

		return string;
	}

	private async attrStore() {
		const attrStore = Video.Attachments[this.attachmentId];
		if (attrStore !== undefined) {
			// If the video was previously downloaded to another path then fix it.
			if (attrStore.filePath !== this.filePath) {
				await Promise.all([
					fs.rename(this.artworkPath.replace(this.filePath, attrStore.filePath), this.artworkPath).catch(() => null),
					fs.rename(this.partialPath.replace(this.filePath, attrStore.filePath), this.partialPath).catch(() => null),
					fs.rename(this.muxedPath.replace(this.filePath, attrStore.filePath), this.muxedPath).catch(() => null),
					fs.rename(this.nfoPath.replace(this.filePath, attrStore.filePath), this.nfoPath).catch(() => null),
				]);
				attrStore.filePath = this.filePath;
			}

			if (attrStore.channelTitle !== this.channelTitle) attrStore.channelTitle = this.channelTitle;

			return attrStore;
		}
		return (Video.Attachments[this.attachmentId] = {
			releaseDate: this.releaseDate.getTime(),
			channelTitle: this.channelTitle,
			filePath: this.filePath,
		});
	}

	private static async pathBytes(path: string) {
		const { size } = await fs.stat(path).catch(() => ({ size: -1 }));
		return size;
	}

	public async getState() {
		const attrStore = await this.attrStore();

		const muxedBytes = await Video.pathBytes(this.muxedPath);
		// If considerAllNonPartialDownloaded is true, return true if the file exists. Otherwise check if the file is the correct size
		if (settings.extras.considerAllNonPartialDownloaded && muxedBytes !== -1) attrStore.muxedSize = muxedBytes;
		if (attrStore.muxedSize === muxedBytes) return VideoState.Muxed;

		const partialBytes = await Video.pathBytes(this.partialPath);
		if (attrStore.partialSize === partialBytes) return VideoState.Partial;

		return VideoState.Missing;
	}

	public async saveNfo() {
		if (await fileExists(this.nfoPath)) return;

		// Make sure the folder for the video exists
		await fs.mkdir(this.folderPath, { recursive: true });

		let season = "";
		let episode = "";
		const match = /S(\d+)E(\d+)/i.exec(this.nfoPath);
		if (match !== null) {
			season = match[1];
			episode = match[2];
		}
		const nfo = builder
			.create("episodedetails")
			.ele("title")
			.text(this.title)
			.up()
			.ele("showtitle")
			.text(this.channelTitle)
			.up()
			.ele("description")
			.text(htmlToText(this.description))
			.up()
			.ele("plot") // Kodi/Plex NFO format uses `plot` as the episode description
			.text(htmlToText(this.description))
			.up()
			.ele("aired") // format: yyyy-mm-dd required for Kodi/Plex
			.text(this.releaseDate.getFullYear().toString() + "-" + nPad(this.releaseDate.getMonth() + 1) + "-" + nPad(this.releaseDate.getDate()))
			.up()
			.ele("season")
			.text(season)
			.up()
			.ele("episode")
			.text(episode)
			.up()
			.end({ pretty: true });
		await fs.writeFile(this.nfoPath, nfo, "utf8");
		await fs.utimes(this.nfoPath, new Date(), this.releaseDate);
	}

	public async downloadArtwork() {
		if (!this.thumbnail) return;
		if (await fileExists(this.artworkPath)) return;

		// Make sure the folder for the video exists
		await fs.mkdir(this.folderPath, { recursive: true });

		fApi.got
			.stream(this.thumbnail.path)
			.pipe(createWriteStream(this.artworkPath))
			.once("end", () => fs.utimes(this.artworkPath, new Date(), this.releaseDate));
		// Save the thumbnail with the same name as the video so plex will use it
	}

	// The number of available slots for making delivery requests,
	// limiting the rate of requests to avoid exceeding the API rate limit.
	private static AvalibleDeliverySlots = 2;
	private static DeliveryTimeout = 61000;
	private static DeliveryQueue: (() => void)[] = [];

	private static async requestDeliverySemaphore() {
		// If there is an available request slot, proceed immediately
		if (Video.AvalibleDeliverySlots > 0) return Video.AvalibleDeliverySlots--;

		// Otherwise, wait for a request slot to become available
		return new Promise((r) => Video.DeliveryQueue.push(() => r(Video.AvalibleDeliverySlots--)));
	}

	private static releaseDeliverySemaphore(): void {
		Video.AvalibleDeliverySlots++;

		// If there are queued requests, resolve the first one in the queue
		Video.DeliveryQueue.shift()?.();
	}

	private async getDelivery() {
		// Ensure that we only call the delivery endpoint twice a minute at most
		await Video.requestDeliverySemaphore();

		// Send download request video, assume the first video attached is the actual video as most will not have more than one video
		const {
			groups: [delivery],
		} = await fApi.cdn.delivery("download", this.attachmentId);

		// Release the semaphore after DeliveryTimeout
		setTimeout(() => Video.releaseDeliverySemaphore(), Video.DeliveryTimeout);

		return delivery;
	}

	public async download(quality: string): Promise<ReturnType<typeof fApi.got.stream>> {
		if ((await this.getState()) === VideoState.Muxed) throw new Error(`Attempting to download "${this.title}" video already downloaded!`);

		let writeStreamOptions, requestOptions;

		// Make sure the folder for the video exists
		await fs.mkdir(this.folderPath, { recursive: true });

		const delivery = await this.getDelivery();
		if (delivery.origins === undefined) throw new Error("Video has no origins to download from!");

		// Round robin edges with download enabled
		const downloadOrigin = this.getOrigin(delivery.origins);

		// Sort qualities from highest to smallest
		const availableVariants = delivery.variants.filter((variant) => variant.url !== "").sort((a, b) => (b.order || 0) - (a.order || 0));

		if (availableVariants.length === 0) throw new Error("No variants available for download!");

		// Set the quality to use based on whats given in the settings.json or the highest available
		const downloadVariant = availableVariants.find((variant) => variant.label.includes(quality)) ?? availableVariants[0];

		const downloadRequest = fApi.got.stream(`${downloadOrigin.url}${downloadVariant.url}`, requestOptions);
		// Pipe the download to the file once response starts
		downloadRequest.pipe(createWriteStream(this.partialPath, writeStreamOptions));
		// Set the videos expectedSize once we know how big it should be for download validation.
		downloadRequest.once("downloadProgress", (progress) => this.attrStore().then((attrStore) => (attrStore.partialSize = progress.total)));

		return downloadRequest;
	}

	private getOrigin(origins: Required<DeliveryResponse["groups"][0]>["origins"]) {
		if (this.originSelector > origins.length - 1) this.originSelector = 0;
		if (this.originSelector === 0) {
			if (Video.OriginSelector > origins.length - 1) Video.OriginSelector = 0;
			return origins[Video.OriginSelector++];
		}
		return origins[this.originSelector++];
	}

	public async muxffmpegMetadata(): Promise<void> {
		if ((await this.getState()) !== VideoState.Partial) throw new Error(`Cannot mux ffmpeg metadata for ${this.title} as its not downloaded.`);
		const artworkEmbed: string[] =
			settings.extras.downloadArtwork && this.thumbnail !== null ? ["-i", this.artworkPath, "-map", "1", "-map", "0", "-disposition:0", "attached_pic"] : [];

		await fs.unlink(this.muxedPath).catch(() => null);
		await new Promise((resolve, reject) =>
			execFile(
				"./db/ffmpeg",
				[
					"-i",
					this.partialPath,
					...artworkEmbed,
					"-metadata",
					`title=${this.title}`,
					"-metadata",
					`AUTHOR=${this.channelTitle}`,
					"-metadata",
					`YEAR=${this.releaseDate.getFullYear().toString()}`,
					"-metadata",
					`date=${this.releaseDate.getFullYear().toString() + nPad(this.releaseDate.getMonth() + 1) + nPad(this.releaseDate.getDate())}`,
					"-metadata",
					`description=${htmlToText(this.description)}`,
					"-metadata",
					`synopsis=${htmlToText(this.description)}`,
					"-c",
					"copy",
					this.muxedPath,
				],
				(error, stdout, stderr) => {
					if (error !== null) {
						error.message ??= "";
						error.message += stderr;
						reject(error);
					} else resolve(stdout);
				}
			)
		);
		await fs.unlink(this.partialPath);
		// Set the files update time to when the video was released
		await fs.utimes(this.muxedPath, new Date(), this.releaseDate);

		const attrStore = await this.attrStore();

		attrStore.muxedSize = await Video.pathBytes(this.muxedPath);
	}

	public async postProcessingCommand(): Promise<void> {
		const result = await exec(this.formatString(settings.postProcessingCommand));
		if (result.stderr !== "") throw new Error(result.stderr);
	}
}
