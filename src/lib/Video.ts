import { Counter, Gauge } from "prom-client";
import { VideoBase, type VideoInfo } from "./VideoBase.js";
import type { Progress } from "got";

import chalk from "chalk";

import { settings, args } from "./helpers/index.js";

import { ProgressHeadless } from "./logging/ProgressConsole.js";
import { ProgressBars } from "./logging/ProgressBars.js";

import { ThrottleGroup, type ThrottleOptions } from "stream-throttle";
import { createWriteStream } from "fs";

import { promisify } from "util";
import { Semaphore } from "./helpers/Semaphore.js";
import { updatePlex } from "./helpers/updatePlex.js";
const sleep = promisify(setTimeout);

const promQueued = new Gauge({
	name: "queued",
	help: "Videos waiting to download",
});
const promErrors = new Counter({
	name: "errors",
	help: "Video errors",
	labelNames: ["message"],
});
const promDownloadedTotal = new Counter({
	name: "downloaded_total",
	help: "Videos downloaded",
});
const promDownloadedBytes = new Counter({
	name: "downloaded_bytes_total",
	help: "Video downloaded bytes",
});

const byteToMbits = 131072;

export class Video extends VideoBase {
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
					case VideoBase.State.Missing: {
						logger.log("Waiting on delivery cdn...");
						const downloadRequest = await this.getVideoStream(settings.floatplane.videoResolution);

						// Pipe the download to the file once response starts
						const writeStream = createWriteStream(this.partialPath);

						// Throttle if enabled
						if (Video.ThrottleGroup) downloadRequest.pipe(Video.ThrottleGroup.throttle(Video.ThrottleOptions).pipe(writeStream));
						else downloadRequest.pipe(writeStream);

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
							await this.saveNfo();
						}
						if (settings.extras.downloadArtwork) {
							logger.log("Saving artwork");
							await this.downloadArtwork();
						}
					}
					// eslint-disable-next-line no-fallthrough
					case VideoBase.State.Partial: {
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
				promErrors.labels({ message: message }).inc();

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
}
