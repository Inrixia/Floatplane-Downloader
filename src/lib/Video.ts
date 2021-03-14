import fs from "fs/promises";
import { execFile } from "child_process";
import { createWriteStream } from "fs";

import { settings } from "./helpers";

import sanitize from "sanitize-filename";
import builder from "xmlbuilder";

import type { Video as fApiVideo } from "floatplane/creator";
// import type { GotOptions } from "floatplane/video";
import type FloatplaneAPI from "floatplane";
import type Request from "got/dist/source/core";

import type Channel from "./Channel";

export default class Video {
	public guid: string;
	public title: string;
	public description: string;
	public releaseDate: Date;
	public thumbnail: fApiVideo["thumbnail"];

	public channel: Channel;

	public filePath: string;
	private folderPath: string;

	constructor(video: fApiVideo, channel: Channel) {
		this.channel = channel;

		this.guid = video.guid;
		this.title = video.title;
		this.description = video.description;
		this.releaseDate = new Date(video.releaseDate);
		this.thumbnail = video.thumbnail;

		const YEAR = this.releaseDate.getFullYear();
		const MONTH = this.releaseDate.getMonth()>9?"0"+this.releaseDate.getMonth():this.releaseDate.getMonth(); // If the month is less than 10 pad it with a 0
		const fullPath = `${settings.filePathFormatting
			.replace(/%channelTitle%/g, this.channel.title)
			.replace(/%episodeNumber%/g, this.channel.lookupVideoDB(this.guid).episodeNo.toString())
			.replace(/%year%/g, YEAR.toString())
			.replace(/%month%/g, MONTH.toString())
			.replace(/%videoTitle%/g, this.title.replace(/ - /g, " ").replace(/\//g, " ").replace(/\\/g, " "))
		}`;
		this.folderPath = fullPath.split("/").slice(0, -1).join("/");
		this.filePath = `${this.folderPath}/${sanitize(fullPath.split("/").slice(-1)[0])}`;
	}

	get expectedSize(): number|undefined {
		return this.channel.lookupVideoDB(this.guid).expectedSize;
	}
	set expectedSize(expectedSize: number|undefined) {
		this.channel.lookupVideoDB(this.guid).expectedSize = expectedSize;
	}

	static getFileBytes = async (path: string): Promise<number> => (await fs.stat(path).catch(() => ({ size: -1 }))).size;

	public downloadedBytes = async (): Promise<number> => Video.getFileBytes(this.filePath);
	public isDownloaded = async (): Promise<boolean> => await this.downloadedBytes() === this.expectedSize;

	public muxedBytes = async (): Promise<number> => Video.getFileBytes(`${this.filePath}.mp4`);
	public isMuxed = async (): Promise<boolean> => await this.muxedBytes() === this.expectedSize;

	public download = async (fApi: FloatplaneAPI, quality: string): Promise<Request> => {
		if (await this.isDownloaded()) throw new Error(`Attempting to download "${this.title}" video already downloaded!`);

		// Make sure the folder for the video exists
		await fs.mkdir(this.folderPath, { recursive: true });

		// If downloading artwork is enabled download it
		if (settings.extras.downloadArtwork && this.thumbnail !== undefined) {
			fApi.got.stream(this.thumbnail.path).pipe(createWriteStream(`${this.filePath}.png`));
		} // Save the thumbnail with the same name as the video so plex will use it

		if (settings.extras.saveNfo) {
			const nfo = builder.create("episodedetails")
				.ele("title").text(this.title).up()
				.ele("showtitle").text(this.channel.title).up()
				.ele("description").text(this.description).up()
				.ele("aired").text(this.releaseDate.toString()).up()
				.ele("season").text("1").up()
				.ele("episode").text(this.channel.lookupVideoDB(this.guid).episodeNo.toString()).up()
				.end({ pretty: true });
			await fs.writeFile(`${this.filePath}.nfo`, nfo, "utf8");
		}
		
		// Handle download resumption if video was partially downloaded
		// const downloadedBytes = await this.downloadedBytes();
		// const [writeStreamOptions, requestOptions] = downloadedBytes !== -1 ? [
		// 	{ start: downloadedBytes, flags: "r+" },
		// 	{ headers: { Range: `bytes=${downloadedBytes}-${this.expectedSize}` }, isStream: true } as GotOptions
		// ] : [
		// 	undefined,
		// 	undefined
		// ];

		// Disabled download resumption due to API not supporting Range headers anymore
		const [writeStreamOptions, requestOptions] = [undefined, undefined];

		// Send download request video
		const downloadRequest = await fApi.video.download(this.guid, quality, requestOptions);
		// Pipe the download to the file once response starts
		downloadRequest.pipe(createWriteStream(`${this.filePath}`, writeStreamOptions));
		// Set the videos expectedSize once we know how big it should be for download validation.
		downloadRequest.once("downloadProgress", progress => this.expectedSize = progress.total);
		
		return downloadRequest;
	}

	public markCompleted = async (): Promise<void> => {
		if (!await this.isMuxed()) throw new Error(`Cannot mark ${this.title} as completed as video file size is not correct. Expected: ${this.expectedSize} bytes, Got: ${await this.muxedBytes()} bytes...`);
		return this.channel.markVideoCompleted(this.guid, this.releaseDate.toString());
	}

	public muxffmpegMetadata = async (): Promise<void> => {
		if (!this.isDownloaded()) throw new Error(`Cannot mux ffmpeg metadata for ${this.title} as its not downloaded. Expected: ${this.expectedSize}, Got: ${await this.downloadedBytes()} bytes...`);
		await new Promise((resolve, reject) => execFile(
			`${settings.ffmpegPath}/ffmpeg`, 
			[
				"-i",
				this.filePath,
				"-metadata", 
				`title=${this.title}`, 
				"-metadata", 
				`AUTHOR=${this.channel.title}`, 
				"-metadata", 
				`YEAR=${this.releaseDate}`, 
				"-metadata", 
				`description=${this.description}`, 
				"-metadata", 
				`synopsis=${this.description}`, 
				"-c:a",
				"copy", 
				"-c:v", 
				"copy",
				`${this.filePath}.mp4`
			], (error, stdout) => {
				if (error !== null) reject(error);
				else resolve(stdout);
			}
		));
		this.expectedSize = await this.muxedBytes();
		await this.markCompleted();
		await fs.unlink(this.filePath);
		// Set the files update time to when the video was released
		await fs.utimes(`${this.filePath}.mp4`, new Date(), this.releaseDate);
	}
}