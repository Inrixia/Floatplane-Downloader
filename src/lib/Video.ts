import fs from "fs/promises";
import { createWriteStream } from "fs";

import { settings } from "./helpers";

import sanitize from "sanitize-filename";
import builder from "xmlbuilder";

import type { Video as fApiVideo } from "floatplane/creator";
import type FloatplaneAPI from "floatplane";
import type Request from "got/dist/source/core";

import type Channel from "./Channel";

export default class Video {
	public guid: string;
	public title: string;
	public description: string;
	public releaseDate: Date;
	public thumbnail: string;

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
			.replace(/%videoTitle%/g, this.title.replace(/ - /g, " "))
		}`;
		this.folderPath = fullPath.split("/").slice(0, -1).join("/");
		this.filePath = `${this.folderPath}/${sanitize(fullPath.split("/").slice(-1)[0])}`;
	}

	/**
	 * @returns {Promise<boolean>}
	 */
	public isDownloaded = async (): Promise<boolean> => await this.downloadedBytes() === this.channel.lookupVideoDB(this.guid).expectedSize;

	public downloadedBytes = async (): Promise<number> => (await fs.stat(`${this.filePath}.mp4`).catch(() => ({ size: -1 }))).size;

	public download = async (fApi: FloatplaneAPI, options: { force?: boolean } = {}): Promise<Request> => {
		if (await this.isDownloaded() && options.force !== true) throw new Error("Video already downloaded! Download with force set to true to overwrite.");

		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const downloadedBytes = await this.downloadedBytes();

		// Make sure the folder for the video exists
		await fs.mkdir(this.folderPath, { recursive: true });

		if (settings.extras.downloadArtwork && this.thumbnail) { // If downloading artwork is enabled download it
			// request(video.thumbnail.path).pipe(fs.createWriteStream(`${video.folderPath}${video.title}.${settings.extras.artworkFormat$}`))
			// TODO: Add generic request to fApi
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
		
		// Download video
		const downloadRequest = await fApi.video.download(this.guid, settings.floatplane.videoResolution.toString(), downloadedBytes!==-1?{ Range: `bytes=${downloadedBytes}-${this.channel.lookupVideoDB(this.guid).expectedSize}` }:undefined);
		downloadRequest.pipe(createWriteStream(`${this.filePath}.mp4`, downloadedBytes!==-1?{ start: downloadedBytes, flags: "r+" }:undefined));
		
		downloadRequest.once("downloadProgress", progress => this.channel.lookupVideoDB(this.guid).expectedSize = progress.total);
		
		return downloadRequest;
	}

	public markDownloaded = async (): Promise<void> => {
		if (await this.downloadedBytes() !== this.channel.lookupVideoDB(this.guid).expectedSize) throw new Error("Cannot mark video as downloaded when file size is not correct.");
		return this.channel.markVideoDownloaded(this.guid, this.releaseDate.toString());
	}
}