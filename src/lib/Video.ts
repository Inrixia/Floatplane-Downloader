import { exec as execCallback, execFile } from "child_process";
import { createWriteStream } from "fs";
import { promisify } from "util";
import fs from "fs/promises";
import { constants } from "fs";
import { settings, fApi } from "./helpers.js";

import { extension } from "mime-types";
import { dirname, basename, extname } from "path";

const exec = promisify(execCallback);

import { htmlToText } from "html-to-text";
import sanitize from "sanitize-filename";
import builder from "xmlbuilder";

import { nPad } from "@inrixia/helpers/math";

import type { BlogPost } from "floatplane/creator";
import type { DeliveryResponse } from "floatplane/cdn";
import type { ValueOfA } from "@inrixia/helpers/ts";
import db from "@inrixia/db";
import { ThrottleGroup, type ThrottleOptions } from "stream-throttle";

const fileExists = async (path: string): Promise<boolean> => {
	try {
		await fs.access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
};

enum VideoState {
	Missing,
	Partial,
	Muxed,
}

type Attachment = {
	partialBytes?: number;
	muxedBytes?: number;
	filePath: string;
	releaseDate: number;
	channelTitle: string;
};

const byteToMbits = 131072;

export class Video {
	private description: BlogPost["text"];
	private releaseDate: Date;
	private thumbnail: BlogPost["thumbnail"];

	public readonly attachmentId: string;
	public readonly post: BlogPost;

	public title: string;
	public channelTitle: string;

	public static State = VideoState;

	private static OriginSelector = 0;
	private originSelector = Video.OriginSelector;

	private static Attachments = db<Record<string, Attachment>>(`./db/attachments.json`);

	private static ThrottleGroup = settings.maxDownloadSpeed > -1 ? new ThrottleGroup({ rate: settings.maxDownloadSpeed * byteToMbits }) : undefined;

	private folderPath: string;
	private filePath: string;

	private artworkPath: string;
	private nfoPath: string;
	private partialPath: string;
	private muxedPath: string;

	constructor(post: BlogPost, attachmentId: string, channelTitle: string, videoTitle: string, dateOffset: number) {
		this.channelTitle = channelTitle;
		this.title = videoTitle;
		this.attachmentId = attachmentId;

		this.post = post;

		this.description = post.text;
		this.releaseDate = new Date(new Date(post.releaseDate).getTime() + dateOffset);
		this.thumbnail = post.thumbnail;

		this.filePath = this.formatString(settings.filePathFormatting)
			.split("/")
			.map((pathPart) => (pathPart.startsWith(".") ? pathPart : sanitize(pathPart)))
			.join("/");

		// Ensure filePath is not exceeding maximum length
		if (this.filePath.length > 250) this.filePath = this.filePath.substring(0, 250);

		this.folderPath = this.filePath.substring(0, this.filePath.lastIndexOf("/"));

		this.artworkPath = `${this.filePath}${settings.artworkSuffix}`;
		this.nfoPath = `${this.filePath}.nfo`;
		this.partialPath = `${this.filePath}.partial`;
		this.muxedPath = `${this.filePath}.mp4`;
	}

	public static GetChannelVideos(filter: (video: Attachment) => boolean) {
		return Object.values(Video.Attachments).filter(filter);
	}

	private static async getThumbExt(filePath: string) {
		const fileDir = dirname(filePath);
		const fileName = basename(filePath);

		const filesInDir = await fs.readdir(fileDir);
		const matchingFile = filesInDir.find((file) => file.startsWith(fileName) && !file.endsWith(".nfo") && !file.endsWith(".partial") && !file.endsWith(".mp4"));
		if (matchingFile) return extname(matchingFile);
		return undefined;
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
		if (settings.extras.considerAllNonPartialDownloaded && muxedBytes !== -1) attrStore.muxedBytes = muxedBytes;
		if (attrStore.muxedBytes === muxedBytes) return VideoState.Muxed;

		const partialBytes = await Video.pathBytes(this.partialPath);
		if (attrStore.partialBytes === partialBytes) return VideoState.Partial;

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
		// If the file already exists
		if (await Video.getThumbExt(this.artworkPath)) return;

		// Make sure the folder for the video exists
		await fs.mkdir(this.folderPath, { recursive: true });

		// Fetch the thumbnail and get its content type
		const response = await fApi.got(this.thumbnail.path, { responseType: "buffer" });
		const contentType = response.headers["content-type"];

		// Map the content type to a file extension
		const fileExtension = contentType ? extension(contentType) : "png"; // Default to jpg if no extension found

		// Update the artworkPath with the correct file extension
		const artworkPathWithExtension = `${this.artworkPath}.${fileExtension}`;

		// Save the thumbnail with the correct file extension
		await fs.writeFile(artworkPathWithExtension, response.body);
		await fs.utimes(artworkPathWithExtension, new Date(), this.releaseDate);
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
		const writeStream = createWriteStream(this.partialPath, writeStreamOptions);
		if (Video.ThrottleGroup) downloadRequest.pipe(Video.ThrottleGroup.throttle(<ThrottleOptions>(<unknown>null))).pipe(writeStream);
		downloadRequest.pipe(writeStream);

		// Set the videos expectedSize once we know how big it should be for download validation.
		downloadRequest.once("downloadProgress", (progress) => this.attrStore().then((attrStore) => (attrStore.partialBytes = progress.total)));

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
		if ((await this.getState()) !== VideoState.Partial) throw new Error(`Cannot mux ffmpeg metadata! Video not downloaded.`);

		let artworkEmbed: string[] = [];
		const artworkExtension = await Video.getThumbExt(this.artworkPath);
		if (settings.extras.downloadArtwork && this.thumbnail !== null && artworkExtension) {
			artworkEmbed = ["-i", `${this.artworkPath}${artworkExtension}`, "-map", "2", "-disposition:0", "attached_pic"];
		}

		await fs.unlink(this.muxedPath).catch(() => null);

		const description = htmlToText(this.description);
		const metadata = {
			title: this.title,
			AUTHOR: this.channelTitle,
			YEAR: this.releaseDate.getFullYear().toString(),
			date: `${this.releaseDate.getFullYear().toString()}${nPad(this.releaseDate.getMonth() + 1)}${nPad(this.releaseDate.getDate())}`,
			description: description,
			synopsis: description,
		};
		const metadataFilePath = `${this.muxedPath}.metadata.txt`;
		const metadataContent = Object.entries(metadata)
			.map(([key, value]) => `${key}=${value.replaceAll(/\n/g, "\\\n")}`)
			.join("\n");
		await fs.writeFile(metadataFilePath, `;FFMETADATA\n${metadataContent}`);

		await new Promise((resolve, reject) =>
			execFile(
				"./db/ffmpeg",
				[
					"-i",
					this.partialPath,
					"-i",
					metadataFilePath, // Include the metadata file as an input
					...artworkEmbed,
					"-map",
					"0",
					"-map_metadata",
					"1",
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
				},
			),
		);
		await fs.unlink(metadataFilePath).catch(() => null);

		await fs.unlink(this.partialPath);
		// Set the files update time to when the video was released
		await fs.utimes(this.muxedPath, new Date(), this.releaseDate);

		const attrStore = await this.attrStore();

		attrStore.muxedBytes = await Video.pathBytes(this.muxedPath);
	}

	public async postProcessingCommand(): Promise<void> {
		const result = await exec(this.formatString(settings.postProcessingCommand));
		if (result.stderr !== "") throw new Error(result.stderr);
	}
}
