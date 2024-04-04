import { Counter, Gauge } from "prom-client";
import { Video } from "./lib/Video.js";

import { settings, args } from "./lib/helpers/index.js";
import { MyPlexAccount } from "@ctrl/plex";

import { ProgressHeadless } from "./lib/logging/ProgressConsole.js";
import { ProgressBars } from "./lib/logging/ProgressBars.js";

import { promisify } from "util";
import { rateLimit } from "./lib/helpers/rateLimit.js";
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

export class VideoDownloader {
	private static readonly MaxRetries = 5;
	private static readonly DownloadThreads = 8;

	// The number of available slots for making delivery requests,
	// limiting the rate of requests to avoid exceeding the API rate limit.
	private static AvalibleDeliverySlots = this.DownloadThreads;
	private static readonly DownloadQueue: (() => void)[] = [];

	private static readonly ProgressLogger = args.headless ? ProgressHeadless : ProgressBars;
	private static async getDownloadSempahore() {
		// If there is an available request slot, proceed immediately
		if (this.AvalibleDeliverySlots > 0) return this.AvalibleDeliverySlots--;

		// Otherwise, wait for a request slot to become available
		return new Promise((r) => this.DownloadQueue.push(() => r(this.AvalibleDeliverySlots--)));
	}

	private static releaseDownloadSemaphore() {
		this.AvalibleDeliverySlots++;

		// If there are queued requests, resolve the first one in the queue
		this.DownloadQueue.shift()?.();
	}

	public static async queueVideo(video: Video) {
		this.ProgressLogger.TotalVideos++;
		promQueued.inc();
		await this.getDownloadSempahore();
		await this.processVideo(video);
		await this.releaseDownloadSemaphore();
		promQueued.dec();
	}

	private static async processVideo(video: Video) {
		const logger = new this.ProgressLogger(video.title);

		for (let retries = 0; retries < VideoDownloader.MaxRetries; retries++) {
			try {
				if (settings.extras.saveNfo) {
					logger.log("Saving .nfo");
					await video.saveNfo();
				}
				if (settings.extras.downloadArtwork) {
					logger.log("Saving artwork");
					await video.downloadArtwork();
				}

				switch (await video.getState()) {
					case Video.State.Missing: {
						logger.log("Waiting on delivery cdn...");

						const downloadRequest = await video.download(settings.floatplane.videoResolution);
						downloadRequest.on("downloadProgress", rateLimit(50, logger.onDownloadProgress.bind(logger)));
						await new Promise((res, rej) => {
							downloadRequest.once("end", res);
							downloadRequest.once("error", rej);
						});
					}
					// eslint-disable-next-line no-fallthrough
					case Video.State.Partial: {
						logger.log("Muxing ffmpeg metadata...");
						await video.muxffmpegMetadata();

						if (settings.postProcessingCommand !== "") {
							logger.log(`Running post download command "${settings.postProcessingCommand}"...`);
							await video.postProcessingCommand().catch((err) => logger.log(`postProcessingCommand failed! ${err.message}\n`));
						}

						if (settings.plex.enabled) await this.updatePlex();
					}
					// eslint-disable-next-line no-fallthrough
					case Video.State.Muxed: {
						logger.done("Muxed");
						VideoDownloader.ProgressLogger.CompletedVideos++;
						promDownloadedTotal.inc();
					}
				}
				return;
			} catch (error) {
				let message = error instanceof Error ? error.message : `Something weird happened, whatever was thrown was not a error! ${error}`;
				if (message.includes("ffmpeg")) {
					const lastIndex = message.lastIndexOf(".partial");
					if (lastIndex !== -1) {
						message = `ffmpeg${message.substring(lastIndex + 9).replace(/\n|\r/g, "")}`;
					}
				}
				promErrors.labels({ message: message }).inc();

				if (retries < VideoDownloader.MaxRetries) {
					logger.error(`${message} - Retrying in ${retries}s [${retries}/${this.MaxRetries}]`);
					// Wait between retries
					await sleep(1000 * (retries + 1));
				} else {
					logger.error(`${message} - Max Retries! [${retries}/${this.MaxRetries}]`);
				}
			}
		}
	}

	private static plexApi: MyPlexAccount;
	private static async updatePlex() {
		if (this.plexApi === undefined) this.plexApi = await new MyPlexAccount(undefined, undefined, undefined, settings.plex.token).connect();
		for (const sectionToUpdate of settings.plex.sectionsToUpdate) {
			const resource = await this.plexApi.resource(sectionToUpdate.server);
			const server = await resource.connect();
			const library = await server.library();
			const section = await library.section(sectionToUpdate.section);
			await section.refresh();
		}
	}
}
