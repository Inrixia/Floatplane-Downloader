import chalk from "chalk-template";
import { exec as execCallback, execFile } from "child_process";
import type { Progress } from "got";
import { htmlToText } from "html-to-text";
import { extension } from "mime-types";
import { Counter, Gauge } from "prom-client";
import { ThrottleGroup, type ThrottleOptions } from "stream-throttle";
import { promisify } from "util";
import builder from "xmlbuilder2";

import { createWriteStream } from "fs";
import { mkdir, stat, unlink, utimes, writeFile } from "fs/promises";

import { Attachment } from "./Attachment";

import { nPad, Semaphore } from "@inrixia/helpers";

import { args, fApi, settings } from "./helpers/index";
import { Selector } from "./helpers/Selector";
import { updatePlex } from "./helpers/updatePlex";

import { ProgressBars } from "./logging/ProgressBars";
import { ProgressHeadless } from "./logging/ProgressConsole";
import { nll, ProgressLogger, withContext } from "./logging/ProgressLogger";

import type { VideoContent } from "floatplane/content";
import { ffmpegPath } from "./helpers/fetchFFMPEG";
import { fileExists } from "./helpers/fileExists";
import { discordEmbed, discordMessage } from "./notifications/discord";
import { telegramMsg } from "./notifications/telegram";

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
	textTracks?: VideoContent["textTracks"];
};

const byteToMbits = 131072;

export class Video extends Attachment {
	public readonly artworkUrl?: string;
	private readonly description: string;
	private textTracks?: VideoContent["textTracks"];

	private static State = VideoState;

	private static readonly MaxRetries = 1;
	private static readonly DownloadThreads = 8;

	private static readonly DownloadSemaphore = new Semaphore(this.DownloadThreads);

	private static readonly ThrottleOptions: ThrottleOptions = { rate: settings.maxDownloadSpeed * byteToMbits };
	private static readonly ThrottleGroup = settings.maxDownloadSpeed > -1 ? new ThrottleGroup(Video.ThrottleOptions) : undefined;

	private static readonly ProgressLogger: typeof ProgressHeadless | typeof ProgressBars = args.headless ? ProgressHeadless : ProgressBars;
	private readonly logger = new Video.ProgressLogger(this.videoTitle);

	// Static cache of instances
	private static readonly Videos: Record<string, Video> = {};
	public static getOrCreate(videoInfo: VideoInfo): Video {
		if (this.Videos[videoInfo.attachmentId] !== undefined) return this.Videos[videoInfo.attachmentId];
		return (this.Videos[videoInfo.attachmentId] = new this(videoInfo));
	}

	private constructor(videoInfo: VideoInfo) {
		super(videoInfo);

		this.description = videoInfo.description;
		this.artworkUrl = videoInfo.artworkUrl;
		this.textTracks = videoInfo.textTracks;
		// Ensure onError is bound to this instance
		this.onError = this.onError.bind(this);
	}

	public async download() {
		promQueued.inc();
		const release = await Video.DownloadSemaphore.obtain();
		try {
			// Make sure the folder for the video exists
			await mkdir(this.folderPath, { recursive: true }).catch((err) => this.onError(err, true));
			if (settings.extras.saveNfo) {
				await this.saveNfo().catch(withContext(`Saving .nfo file`)).catch(this.onError);
			}
			if (settings.extras.downloadArtwork) {
				await this.downloadArtwork().catch(withContext(`Saving artwork`)).catch(this.onError);
			}
			if (settings.extras.downloadCaptions) {
				await this.updateTextTracks().catch(withContext(`Downloading captions`)).catch(this.onError);
			}
			if ((await this.getState()) === Video.State.Muxed) {
				this.logger.done(chalk`{green Exists! Skipping}`);
				return;
			}
			for (let retries = 0; retries < Video.MaxRetries; retries++) {
				try {
					switch (await this.getState()) {
						case Video.State.Missing: {
							await this.onMissing().catch(withContext(`Downloading missing video`));
						}
						// eslint-disable-next-line no-fallthrough
						case Video.State.Partial: {
							this.logger.log("Muxing ffmpeg metadata...");
							await this.muxffmpegMetadata().catch(withContext(`Muxing ffmpeg metadata`));

							if (settings.postProcessingCommand !== "") {
								this.logger.log(`Running settings.postProcessingCommand...`);
								await this.postProcessingCommand().catch(withContext(`postProcessingCommand`));
							}

							if (settings.plex.enabled) {
								await updatePlex().catch(withContext(`Updating plex`));
							}
						}
					}
					telegramMsg(`Downloaded ${this.videoTitle} from ${this.channelTitle}`);
					discordEmbed("New video downloaded", this);
					this.logger.done(chalk`{cyan Downloaded!}`);
					promDownloadedTotal.inc();
					break;
				} catch (err) {
					this.onError(err);
					if (retries < Video.MaxRetries) await sleep(5000);
				}
			}
		} finally {
			release();
			promQueued.dec();
		}
	}

	private onError(err: unknown, throwAfterLog = false) {
		const errStatement = this.logger.error(err);
		console.error(`[${this.videoTitle}]`, errStatement);

		const errStr = ProgressLogger.sanitizeError(err);
		promErrors.labels({ message: errStr, attachmentId: this.attachmentId }).inc();

		const message = `Error downloading ${this.videoTitle} from ${this.channelTitle}: ${errStr}`;
		telegramMsg(message);
		discordMessage(message);

		if (throwAfterLog) throw err;
	}

	private async onMissing() {
		this.logger.log("Waiting on delivery cdn...");
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
			this.logger.onDownloadProgress(downloadRequest.downloadProgress, bytesSinceLast);
		};

		let downloadInterval: NodeJS.Timeout;
		downloadRequest.once("downloadProgress", (downloadProgress: Progress) => {
			this.logger.log("Download started!");
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

		this.logger.log("Download complete!");
	}

	private static async pathBytes(path: string) {
		const { size } = await stat(path).catch(() => ({ size: -1 }));
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
		this.logger.log("Saving .nfo");

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
		await writeFile(this.nfoPath, nfo, "utf8");
		await utimes(this.nfoPath, new Date(), this.releaseDate);
		this.logger.log("Saved .nfo");
	}

	public async downloadArtwork() {
		if (!this.artworkUrl) return;
		// If the file already exists
		if (await this.artworkFileExtension()) return;
		this.logger.log("Saving artwork");

		// Fetch the thumbnail and get its content type
		const response = await fApi.got(this.artworkUrl, { responseType: "buffer" });
		const contentType = response.headers["content-type"];

		// Map the content type to a file extension
		const fileExtension = contentType ? `.${extension(contentType)}` : Attachment.Extensions.Thumbnail;

		// Update the artworkPath with the correct file extension
		const artworkPathWithExtension = `${this.artworkPath}${fileExtension}`;

		// Save the thumbnail with the correct file extension
		await writeFile(artworkPathWithExtension, Uint8Array.from(response.body));
		await utimes(artworkPathWithExtension, new Date(), this.releaseDate);
		this.logger.log("Saved artwork");
	}

	private async downloadCaptions() {
		if (this.textTracks === undefined) return;
		const captions = this.textTracks.filter((track) => track.kind === "captions");
	   	if (captions.length === 0) return;

		const toDownload: Array<{ src: string; path: string }> = [];
		for (const caption of captions) {
			const captionPath = `${this.filePath}${caption.language ? `.${caption.language}` : ""}.vtt`;
			if (!(await fileExists(captionPath))) {
				toDownload.push({ src: caption.src, path: captionPath });
			}
		}
		if (toDownload.length === 0) return;

		this.logger.log("Saving captions");
		for (const { src, path } of toDownload) {
			const captionContent = await (await fetch(src)).text();
			await writeFile(path, captionContent, "utf8");
		}
		this.logger.log("Saved captions");
	}

	public async updateTextTracks() {
		if (this.textTracks && this.textTracks.length > 0) return;

		try {
			const video = await fApi.content.video(this.attachmentId);
			const newTextTracks = video.textTracks?.filter((track) => track.kind === "captions") ?? [];

			if (newTextTracks.length > 0) {
				this.textTracks = newTextTracks;

				await this.downloadCaptions().catch((error) => {
					console.error(`Failed to download captions for ${this.attachmentId}:`, error);
				});
			}
		} catch (error) {
			console.error(`Failed to fetch text tracks for ${this.attachmentId}:`, error);
		}
	}

	// The number of available slots for making delivery requests,
	// limiting the rate of requests to avoid exceeding the API rate limit.
	private static DeliveryTimeout = 65000;
	private static DeliverySemaphore = new Semaphore(2);
	private async getDelivery() {
		// Ensure that we only call the delivery endpoint twice a minute at most
		const release = await Video.DeliverySemaphore.obtain();

		// Send download request video, assume the first video attached is the actual video as most will not have more than one video
		const deliveryInfo = await fApi.cdn.delivery("download", this.attachmentId);

		// Release the semaphore after DeliveryTimeout
		setTimeout(release, Video.DeliveryTimeout);

		return deliveryInfo?.groups?.[0];
	}

	protected async getVideoStream(quality: string): Promise<ReturnType<typeof fApi.got.stream>> {
		if ((await this.getState()) === VideoState.Muxed) throw new Error(`Attempting to download "${this.videoTitle}" video already downloaded!`);

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

		await unlink(this.muxedPath).catch(nll);

		const description = htmlToText(this.description);
		const metadata = {
			title: this.videoTitle,
			AUTHOR: this.channelTitle,
			YEAR: this.releaseDate.getFullYear().toString(),
			date: `${this.releaseDate.getFullYear().toString()}${nPad(this.releaseDate.getMonth() + 1)}${nPad(this.releaseDate.getDate())}`,
			description: description,
			synopsis: description,
		};
		const metadataFilePath = `${this.folderPath}/${Math.random()}.ffmeta`;
		const metadataContent = Object.entries(metadata)
			.map(([key, value]) => `${key}=${value.replaceAll(/\n/g, "\\\n")}`)
			.join("\n");
		try {
			await writeFile(metadataFilePath, `;FFMETADATA\n${metadataContent}`);
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
					}
				)
			);
			// Remove the partial file when done
			await unlink(this.partialPath);
			// Set the files update time to when the video was released
			await utimes(this.muxedPath, new Date(), this.releaseDate);

			(await this.attachmentInfo()).muxedBytes = await Video.pathBytes(this.muxedPath);
		} finally {
			// Ensure the metadata file is removed
			await unlink(metadataFilePath).catch(nll);
		}
	}

	public async postProcessingCommand(): Promise<void> {
		const result = await exec(this.formatFilePath(settings.postProcessingCommand));
		if (result.stderr !== "") throw new Error(result.stderr);
	}
}
