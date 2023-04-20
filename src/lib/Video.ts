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
import type Channel from "./Channel.js";
import { DeliveryResponse } from "floatplane/cdn";
import { VideoDBEntry } from "./Channel.js";
import { ValueOfA } from "@inrixia/helpers/ts";

const fileExists = async (path: string): Promise<boolean> => {
	try {
		await fs.access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
};

const EXT = "mp4";

export default class Video {
	public guid: BlogPost["guid"];
	public title: BlogPost["title"];
	public description: BlogPost["text"];
	public releaseDate: Date;
	public thumbnail: BlogPost["thumbnail"];

	public videoAttachments: string[];

	public channel: Channel;
	private videoDBEntry: VideoDBEntry;

	private static OriginSelector = 0;
	private originSelector = Video.OriginSelector;

	public fullPath: string;
	private folderPath: string;
	private artworkPath: string;

	constructor(video: BlogPost, channel: Channel, videoDBEntry: VideoDBEntry) {
		this.channel = channel;
		this.videoDBEntry = videoDBEntry;

		this.guid = video.guid;
		this.videoAttachments = video.attachmentOrder.filter((a) => video.videoAttachments?.includes(a));
		this.title = video.title;
		this.description = video.text;
		this.releaseDate = new Date(video.releaseDate);
		this.thumbnail = video.thumbnail;

		this.fullPath = this.formatString(settings.filePathFormatting)
			.split("/")
			.map((pathPart) => (pathPart.startsWith(".") ? pathPart : sanitize(pathPart)))
			.join("/");

		this.folderPath = this.fullPath.substring(0, this.fullPath.lastIndexOf("/"));
		this.artworkPath = `${this.fullPath}${settings.artworkSuffix}.png`;
	}

	public static FilePathOptions = ["%channelTitle%", "%year%", "%month%", "%day%", "%hour%", "%minute%", "%second%", "%videoTitle%"] as const;
	private formatString(string: string): string {
		const formatLookup: Record<ValueOfA<typeof Video.FilePathOptions>, string> = {
			"%channelTitle%": this.channel.title,
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

	/**
	 * Get the suffix for a video file if there are multiple videoAttachments for this video
	 */
	private multiPartSuffix = (attachmentIndex: string | number): string => `${this.videoAttachments.length !== 1 ? ` - part${+attachmentIndex + 1}` : ""}`;

	get expectedSize(): number | undefined {
		return this.videoDBEntry.expectedSize;
	}
	set expectedSize(expectedSize: number | undefined) {
		this.videoDBEntry.expectedSize = expectedSize;
	}

	static getFileBytes = async (path: string): Promise<number> => (await fs.stat(path).catch(() => ({ size: -1 }))).size;

	public fileBytes = async (extension: string): Promise<number> => {
		let bytes = 0;
		for (const i in this.videoAttachments) {
			bytes += await Video.getFileBytes(`${this.fullPath}${this.multiPartSuffix(i)}.${extension}`);
		}
		return bytes;
	};
	public isDownloaded = async (): Promise<boolean> => {
		if (this.expectedSize === undefined) return false;
		if (await this.isMuxed()) return true;
		return (await this.fileBytes("partial")) === this.expectedSize;
	};
	public isMuxed = async (): Promise<boolean> => {
		if (this.expectedSize === undefined) return false;
		const fileBytes = await this.fileBytes(EXT);
		// If considerAllNonPartialDownloaded is true, return true if the file exists. Otherwise check if the file is the correct size
		if (settings.extras.considerAllNonPartialDownloaded) return fileBytes !== -1;
		return fileBytes === this.expectedSize;
	};

	public async saveNfo() {
		const nfoPath = `${this.fullPath}.nfo`;
		if (await fileExists(nfoPath)) return;

		// Make sure the folder for the video exists
		await fs.mkdir(this.folderPath, { recursive: true });

		let season = "";
		let episode = "";
		const match = /S(\d+)E(\d+)/i.exec(this.fullPath);
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
			.text(this.channel.title)
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
		await fs.writeFile(nfoPath, nfo, "utf8");
		await fs.utimes(nfoPath, new Date(), this.releaseDate);
	}

	public async downloadArtwork() {
		if (this.thumbnail === null) return;
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

	private static async requestDeliverySemaphore(): Promise<void> {
		// If there is an available request slot, proceed immediately
		if (Video.AvalibleDeliverySlots > 0) {
			Video.AvalibleDeliverySlots -= 1;
			return;
		}

		// Otherwise, wait for a request slot to become available
		await new Promise((r) => Video.DeliveryQueue.push(() => r((Video.AvalibleDeliverySlots -= 1))));
	}

	private static releaseDeliverySemaphore(): void {
		Video.AvalibleDeliverySlots += 1;

		// If there are queued requests, resolve the first one in the queue
		Video.DeliveryQueue.shift()?.();
	}

	private async *getDeliveries() {
		for (const attachment of this.videoAttachments) {
			// Ensure that we only call the delivery endpoint twice a minute at most
			await Video.requestDeliverySemaphore();

			// Send download request video, assume the first video attached is the actual video as most will not have more than one video
			const {
				groups: [delivery],
			} = await fApi.cdn.delivery("download", attachment);

			// Release the semaphore after DeliveryTimeout
			setTimeout(() => Video.releaseDeliverySemaphore(), Video.DeliveryTimeout);

			yield delivery;
		}
	}

	public async *download(quality: string): AsyncGenerator<ReturnType<typeof fApi.got.stream>> {
		if (await this.isDownloaded()) throw new Error(`Attempting to download "${this.title}" video already downloaded!`);

		let writeStreamOptions, requestOptions;

		// Make sure the folder for the video exists
		await fs.mkdir(this.folderPath, { recursive: true });

		let i = 0;
		for await (const delivery of this.getDeliveries()) {
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
			downloadRequest.pipe(createWriteStream(`${this.fullPath}${this.multiPartSuffix(i++)}.partial`, writeStreamOptions));
			// Set the videos expectedSize once we know how big it should be for download validation.
			if (this.expectedSize === undefined) downloadRequest.once("downloadProgress", (progress) => (this.expectedSize = progress.total));
			yield downloadRequest;
		}
	}

	private getOrigin(origins: Required<DeliveryResponse["groups"][0]>["origins"]) {
		if (this.originSelector > origins.length - 1) this.originSelector = 0;
		if (this.originSelector === 0) {
			if (Video.OriginSelector > origins.length - 1) Video.OriginSelector = 0;
			return origins[Video.OriginSelector++];
		}
		return origins[this.originSelector++];
	}

	public async markCompleted(): Promise<void> {
		if (!(await this.isMuxed()))
			throw new Error(
				`Cannot mark ${this.title} as completed as video file size is not correct. Expected: ${this.expectedSize} bytes, Got: ${await this.fileBytes(EXT)} bytes...`
			);
		return this.channel.markVideoFinished(this.guid, this.releaseDate.getTime());
	}

	get ffmpegDesc() {
		return htmlToText(this.description);
	}

	public async muxffmpegMetadata(): Promise<void> {
		if (!this.isDownloaded())
			throw new Error(
				`Cannot mux ffmpeg metadata for ${this.title} as its not downloaded. Expected: ${this.expectedSize}, Got: ${await this.fileBytes("partial")} bytes...`
			);
		const artworkEmbed: string[] =
			settings.extras.downloadArtwork && this.thumbnail !== null ? ["-i", this.artworkPath, "-map", "1", "-map", "0", "-disposition:0", "attached_pic"] : [];
		await Promise.all(
			this.videoAttachments.map(
				(a, i) =>
					new Promise((resolve, reject) =>
						execFile(
							"./db/ffmpeg",
							[
								"-i",
								`${this.fullPath}${this.multiPartSuffix(i)}.partial`,
								...artworkEmbed,
								"-metadata",
								`title=${this.title}${this.multiPartSuffix(i)}`,
								"-metadata",
								`AUTHOR=${this.channel.title}`,
								"-metadata",
								`YEAR=${this.releaseDate.getFullYear().toString()}`,
								"-metadata",
								`date=${this.releaseDate.getFullYear().toString() + nPad(this.releaseDate.getMonth() + 1) + nPad(this.releaseDate.getDate())}`,
								"-metadata",
								`description=${this.ffmpegDesc}`,
								"-metadata",
								`synopsis=${this.ffmpegDesc}`,
								"-c",
								"copy",
								`${this.fullPath}${this.multiPartSuffix(i)}.${EXT}`,
							],
							(error, stdout, stderr) => {
								if (error !== null) {
									error.message ??= "";
									error.message += stderr;
									reject(error);
								} else resolve(stdout);
							}
						)
					)
			)
		);
		this.expectedSize = await this.fileBytes(EXT);
		await this.markCompleted();
		for (const i in this.videoAttachments) {
			await fs.unlink(`${this.fullPath}${this.multiPartSuffix(i)}.partial`);
			// Set the files update time to when the video was released
			await fs.utimes(`${this.fullPath}${this.multiPartSuffix(i)}.${EXT}`, new Date(), this.releaseDate);
		}
	}

	public async postProcessingCommand(): Promise<void> {
		const result = await exec(this.formatString(settings.postProcessingCommand));
		if (result.stderr !== "") throw new Error(result.stderr);
	}
}
