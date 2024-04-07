import { exec as execCallback, execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import { settings, fApi } from "./helpers/index.js";

import { extension } from "mime-types";

const exec = promisify(execCallback);

import { htmlToText } from "html-to-text";
import builder from "xmlbuilder";

import { nPad } from "@inrixia/helpers/math";

import { Semaphore } from "./helpers/Semaphore.js";
import { Attachment } from "./Attachment.js";
import { fileExists } from "./helpers/fileExists.js";
import { Selector } from "./helpers/Selector.js";

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
export class VideoBase extends Attachment {
	private readonly description: string;
	private readonly artworkUrl?: string;

	public static State = VideoState;

	protected constructor(videoInfo: VideoInfo) {
		super(videoInfo);

		this.description = videoInfo.description;
		this.artworkUrl = videoInfo.artworkUrl;
	}

	private static async pathBytes(path: string) {
		const { size } = await fs.stat(path).catch(() => ({ size: -1 }));
		return size;
	}

	public async getState() {
		const attrStore = await this.attachmentInfo();

		const muxedBytes = await VideoBase.pathBytes(this.muxedPath);
		// If considerAllNonPartialDownloaded is true, return true if the file exists. Otherwise check if the file is the correct size
		if (settings.extras.considerAllNonPartialDownloaded && muxedBytes !== -1) attrStore.muxedBytes = muxedBytes;
		if (attrStore.muxedBytes === muxedBytes) return VideoState.Muxed;

		const partialBytes = await VideoBase.pathBytes(this.partialPath);
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
			.text(this.videoTitle)
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
		await fs.writeFile(artworkPathWithExtension, response.body);
		await fs.utimes(artworkPathWithExtension, new Date(), this.releaseDate);
	}

	// The number of available slots for making delivery requests,
	// limiting the rate of requests to avoid exceeding the API rate limit.
	private static DeliveryTimeout = 65000;
	private static DeliverySemaphore = new Semaphore(2);
	private async getDelivery() {
		// Ensure that we only call the delivery endpoint twice a minute at most
		await VideoBase.DeliverySemaphore.obtain();

		// Send download request video, assume the first video attached is the actual video as most will not have more than one video
		const {
			groups: [delivery],
		} = await fApi.cdn.delivery("download", this.attachmentId);

		// Release the semaphore after DeliveryTimeout
		setTimeout(() => VideoBase.DeliverySemaphore.release(), VideoBase.DeliveryTimeout);

		return delivery;
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

		(await this.attachmentInfo()).muxedBytes = await VideoBase.pathBytes(this.muxedPath);
	}

	public async postProcessingCommand(): Promise<void> {
		const result = await exec(this.formatFilePath(settings.postProcessingCommand));
		if (result.stderr !== "") throw new Error(result.stderr);
	}
}
