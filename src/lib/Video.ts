import { ThrottleGroup, type ThrottleOptions } from "stream-throttle";
import { exec as execCallback, execFile } from "child_process";
import { Counter, Gauge } from "prom-client";
import { htmlToText } from "html-to-text";
import { extension } from "mime-types";
import type { Progress } from "got";
import builder from "xmlbuilder2";
import { promisify } from "util";
import chalk from "chalk-template";

import { createWriteStream } from "fs";
import fs from "fs/promises";

import { Attachment } from "./Attachment.js";

import { nPad } from "@inrixia/helpers/math";

import { settings, fApi, args } from "./helpers/index.js";
import { Semaphore } from "./helpers/Semaphore.js";
import { fileExists } from "./helpers/fileExists.js";
import { Selector } from "./helpers/Selector.js";
import { updatePlex } from "./helpers/updatePlex.js";

import { ProgressHeadless } from "./logging/ProgressConsole.js";
import { ProgressBars } from "./logging/ProgressBars.js";

import { ffmpegPath } from "./helpers/fetchFFMPEG.js";

const exec = promisify(execCallback);
const sleep = promisify(setTimeout);

const promQueued = new Gauge({
	name: "queued",
	help: "Videos waiting to download",
});
const promErrors = new Counter({
	name: "errors",
	help: "Video errors",
	labelNames: ["message", "attachmentId"],
});
const promDownloadedTotal = new Counter({
	name: "downloaded_total",
	help: "Videos downloaded",
});
const promDownloadedBytes = new Counter({
	name: "downloaded_bytes_total",
	help: "Video downloaded bytes",
});

enum VideoState {
	Missing,
	Partial,
	Muxed,
}
export type VideoInfo = {
	description: string;
	artworkUrl?: string;
	attachmentId: string;
	channelTitle: string;
	videoTitle: string;
	releaseDate: Date;
};

const byteToMbits = 131072;

export class Video extends Attachment {
	private readonly description: string;
	private readonly artworkUrl?: string;

	public static State = VideoState;

	private static readonly MaxRetries = 5;
	private static readonly DownloadThreads = 8;

	private static readonly DownloadSemaphore = new Semaphore(this.DownloadThreads);

	private static readonly ThrottleOptions: ThrottleOptions = { rate: settings.maxDownloadSpeed * byteToMbits };
	private static readonly ThrottleGroup = settings.maxDownloadSpeed > -1 ? new ThrottleGroup(Video.ThrottleOptions) : undefined;

	private static readonly ProgressLogger: typeof ProgressHeadless | typeof ProgressBars = args.headless ? ProgressHeadless : ProgressBars;

	// Static cache of instances
	public static readonly Videos: Record<string, Video> = {};
	public static getOrCreate(videoInfo: VideoInfo): Video {
		if (this.Videos[videoInfo.attachmentId] !== undefined) return this.Videos[videoInfo.attachmentId];
		return (this.Videos[videoInfo.attachmentId] = new this(videoInfo));
	}

	private constructor(videoInfo: VideoInfo) {
		super(videoInfo);

		this.description = videoInfo.description;
		this.artworkUrl = videoInfo.artworkUrl;
	}

	public async download() {
		if ((await this.getState()) === Video.State.Muxed) return;
		const logger = new Video.ProgressLogger(this.videoTitle);
		promQueued.inc();
		await Video.DownloadSemaphore.obtain();
		logger.start();
		for (let retries = 1; retries < Video.MaxRetries + 1; retries++) {
			try {
				switch (await this.getState()) {
					case Video.State.Missing: {
						logger.log("Waiting on delivery cdn...");
						const downloadRequest = await this.getVideoStream(settings.floatplane.videoResolution);

						// Pipe the download to the file once response starts
						const writeStream = createWriteStream(this.partialPath);

						// Throttle if enabled
						if (Video.ThrottleGroup) {
							// @ts-expect-error Type is wrong, this needs to be called with no arguments
							const throttle = Video.ThrottleGroup.throttle();
							downloadRequest.pipe(throttle).pipe(writeStream);
						} else downloadRequest.pipe(writeStream);

						let downloadedBytes = 0;
						const onDownloadProgress = (progress: Progress) => {
							const bytesSinceLast = progress.transferred - downloadedBytes;
							downloadedBytes = progress.transferred;
							promDownloadedBytes.inc(bytesSinceLast);
							logger.onDownloadProgress(downloadRequest.downloadProgress, bytesSinceLast);
						};

						let downloadInterval: NodeJS.Timeout;
						downloadRequest.once("downloadProgress", (downloadProgress: Progress) => {
							logger.log("Download started!");
							downloadInterval = setInterval(() => onDownloadProgress(downloadRequest.downloadProgress), 250);
							onDownloadProgress(downloadProgress);
						});

						await new Promise((res, rej) => {
							downloadRequest.once("end", res);
							downloadRequest.once("error", rej);
						}).finally(() => {
							clearInterval(downloadInterval);
							onDownloadProgress(downloadRequest.downloadProgress);
						});

						logger.log("Download complete!");
						if (settings.extras.saveNfo) {
							logger.log("Saving .nfo");
							try {
								await this.saveNfo();
							} catch (error) {
								// non-critical error
								const message = this.parseErrorMessage(error);
								logger.error(`Failed to save .nfo file! ${message} - Skipping`);
							}
						}
						if (settings.extras.downloadArtwork) {
							logger.log("Saving artwork");
							try {
								await this.downloadArtwork();
							} catch (error) {
								// non-critical error
								const message = this.parseErrorMessage(error);
								logger.error(`Failed to save artwork! ${message} - Skipping`);
							}
						}
					}
					// eslint-disable-next-line no-fallthrough
					case Video.State.Partial: {
						logger.log("Muxing ffmpeg metadata...");
						await this.muxffmpegMetadata();

						if (settings.postProcessingCommand !== "") {
							logger.log(`Running post download command "${settings.postProcessingCommand}"...`);
							await this.postProcessingCommand().catch((err) => logger.log(`postProcessingCommand failed! ${err.message}\n`));
						}

						if (settings.plex.enabled) {
							await updatePlex().catch((err) => {
								throw new Error(`Updating plex failed! ${err.message}`);
							});
						}
					}
				}
				logger.done(chalk`{cyan Download & Muxing complete!}`);
				promDownloadedTotal.inc();
				break;
			} catch (error) {
				const message = this.parseErrorMessage(error);
				promErrors.labels({ message, attachmentId: this.attachmentId }).inc();

				if (retries < Video.MaxRetries) {
					logger.error(`${message} - Retrying in ${retries}s [${retries}/${Video.MaxRetries}]`);
					await sleep(1000 * retries);
				} else {
					logger.error(`${message} - Failed`);
				}
			}
		}
		await Video.DownloadSemaphore.release();
		promQueued.dec();
	}

	private parseErrorMessage(error: unknown): string {
		let message = error instanceof Error ? error.message : `Something weird happened, whatever was thrown was not a error! ${error}`;
		if (message.includes("ffmpeg")) {
			const lastIndex = message.lastIndexOf(Video.Extensions.Partial);
			if (lastIndex !== -1) {
				message = `ffmpeg${message.substring(lastIndex + 9).replace(/\n|\r/g, "")}`;
			}
		}
		return message;
	}

	private static async pathBytes(path: string) {
		const { size } = await fs.stat(path).catch(() => ({ size: -1 }));
		return size;
	}

	public async getState() {
		const attrStore = await this.attachmentInfo();

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
			.create()
			.ele("episodedetails")
			.ele("title")
			.txt(this.videoTitle)
			.up()
			.ele("showtitle")
			.txt(this.channelTitle)
			.up()
			.ele("description")
			.txt(htmlToText(this.description))
			.up()
			.ele("plot") // Kodi/Plex NFO format uses `plot` as the episode description
			.txt(htmlToText(this.description))
			.up()
			.ele("aired") // format: yyyy-mm-dd required for Kodi/Plex
			.txt(this.releaseDate.getFullYear().toString() + "-" + nPad(this.releaseDate.getMonth() + 1) + "-" + nPad(this.releaseDate.getDate()))
			.up()
			.ele("season")
			.txt(season)
			.up()
			.ele("episode")
			.txt(episode)
			.up()
			.end({ prettyPrint: true });
		await fs.writeFile(this.nfoPath, nfo, "utf8");
		await fs.utimes(this.nfoPath, new Date(), this.releaseDate);
	}

	public async downloadArtwork() {
		if (!this.artworkUrl) return;
		// If the file already exists
		if (await this.artworkFileExtension()) return;

		// Make sure the folder for the video exists
		await fs.mkdir(this.folderPath, { recursive: true });

		// Fetch the thumbnail and get its content type
		const response = await fApi.got(this.artworkUrl, { responseType: "buffer" });
		const contentType = response.headers["content-type"];

		// Map the content type to a file extension
		const fileExtension = contentType ? `.${extension(contentType)}` : Attachment.Extensions.Thumbnail;

		// Update the artworkPath with the correct file extension
		const artworkPathWithExtension = `${this.artworkPath}${fileExtension}`;

		// Save the thumbnail with the correct file extension
		await fs.writeFile(artworkPathWithExtension, Uint8Array.from(response.body));
		await fs.utimes(artworkPathWithExtension, new Date(), this.releaseDate);
	}

	// The number of available slots for making delivery requests,
	// limiting the rate of requests to avoid exceeding the API rate limit.
	private static DeliveryTimeout = 65000;
	private static DeliverySemaphore = new Semaphore(2);
	private async getDelivery() {
		// Ensure that we only call the delivery endpoint twice a minute at most
		await Video.DeliverySemaphore.obtain();

		// Send download request video, assume the first video attached is the actual video as most will not have more than one video
		const deliveryInfo = await fApi.cdn.delivery("download", this.attachmentId);

		// Release the semaphore after DeliveryTimeout
		setTimeout(() => Video.DeliverySemaphore.release(), Video.DeliveryTimeout);

		return deliveryInfo?.groups?.[0];
	}

	protected async getVideoStream(quality: string): Promise<ReturnType<typeof fApi.got.stream>> {
		if ((await this.getState()) === VideoState.Muxed) throw new Error(`Attempting to download "${this.videoTitle}" video already downloaded!`);

		// Make sure the folder for the video exists
		await fs.mkdir(this.folderPath, { recursive: true });

		const delivery = await this.getDelivery();
		if (delivery?.origins === undefined) throw new Error("Video has no origins to download from!");

		// Round robin edges with download enabled
		const downloadOrigin = Selector.next(delivery.origins);

		// Sort qualities from highest to smallest
		const availableVariants = delivery.variants.filter((variant) => variant.url !== "").sort((a, b) => (b.order || 0) - (a.order || 0));

		if (availableVariants.length === 0) throw new Error("No variants available for download!");

		// Set the quality to use based on whats given in the settings.json or the highest available
		const downloadVariant = availableVariants.find((variant) => variant.label.includes(quality)) ?? availableVariants[0];

		const downloadRequest = fApi.got.stream(`${downloadOrigin.url}${downloadVariant.url}`);

		// Set the videos expectedSize once we know how big it should be for download validation.
		downloadRequest.once("downloadProgress", async (progress) => ((await this.attachmentInfo()).partialBytes = progress.total));

		return downloadRequest;
	}

	public async muxffmpegMetadata(): Promise<void> {
		if ((await this.getState()) !== VideoState.Partial) throw new Error(`Cannot mux ffmpeg metadata! Video not downloaded.`);

		let artworkEmbed: string[] = [];
		const artworkExtension = await this.artworkFileExtension();
		if (settings.extras.downloadArtwork && this.artworkUrl !== null && artworkExtension) {
			artworkEmbed = ["-i", `${this.artworkPath}${artworkExtension}`, "-map", "2", "-disposition:0", "attached_pic"];
		}

		await fs.unlink(this.muxedPath).catch(() => null);

		const description = htmlToText(this.description);
		const metadata = {
			title: this.videoTitle,
			AUTHOR: this.channelTitle,
			YEAR: this.releaseDate.getFullYear().toString(),
			date: `${this.releaseDate.getFullYear().toString()}${nPad(this.releaseDate.getMonth() + 1)}${nPad(this.releaseDate.getDate())}`,
			description: description,
			synopsis: description,
		};
		const metadataFilePath = `${this.muxedPath}.ffmeta`;
		const metadataContent = Object.entries(metadata)
			.map(([key, value]) => `${key}=${value.replaceAll(/\n/g, "\\\n")}`)
			.join("\n");
		await fs.writeFile(metadataFilePath, `;FFMETADATA\n${metadataContent}`);

		await new Promise((resolve, reject) =>
			execFile(
				ffmpegPath,
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

		(await this.attachmentInfo()).muxedBytes = await Video.pathBytes(this.muxedPath);
	}

	public async postProcessingCommand(): Promise<void> {
		const result = await exec(this.formatFilePath(settings.postProcessingCommand));
		if (result.stderr !== "") throw new Error(result.stderr);
	}
}
