import fs from "fs/promises";
import { createWriteStream } from "fs";

import { settings } from "./helpers";

import sanitize from "sanitize-filename";
import builder from "xmlbuilder";

import type { Video as fApiVideo } from "floatplane/creator";
import type FloatplaneAPI from "floatplane";
import type Request from "got/dist/source/core";

import type { VideoDBEntry } from "./Channel";

export default class Video {
	private guid: string;
	private title: string;
	private description: string;
	private releaseDate: Date;
	private thumbnail: string;

	private channelTitle: string;
	private _db: VideoDBEntry;

	public file: string;

	constructor(video: fApiVideo, channelTitle: string, db: VideoDBEntry) {
		this.guid = video.guid;
		this.title = video.title;
		this.description = video.description;
		this.releaseDate = new Date(video.releaseDate);
		this.thumbnail = video.thumbnail;
		this.channelTitle = channelTitle;
		this._db = db;

		const YEAR = this.releaseDate.getFullYear();
		const MONTH = this.releaseDate.getMonth()>9?"0"+this.releaseDate.getMonth():this.releaseDate.getMonth(); // If the month is less than 10 pad it with a 0

		this.file = sanitize(`${settings.fileFormatting
			.replace(/%channelTitle%/g, this.channelTitle)
			.replace(/%episodeNo%/g, this._db.e.toString())
			.replace(/%year%/g, YEAR.toString())
			.replace(/%month%/g, MONTH.toString())
			.replace(/%videoTitle%/g, this.title.replace(/ - /g, " "))}`
		);
	}

	/**
	 * @returns {Promise<boolean>}
	 */
	public isDownloaded = async (): Promise<boolean> => {
		if (this._db.d === true) {
			if (this._db.f === undefined) return this._db.d = false;
			else {
				try {
					if (await this.fileSize() === this._db.s) return true;
					else return false;
				} catch (err) { 
					return false; 
				}
			}
		} else return false;
	}

	public fileSize = async (): Promise<number>  => {
		return (await fs.stat(this.file)).size;
	}

	public download = async (fApi: FloatplaneAPI, options: { force?: boolean } = {}): Promise<Request> => {
		if (await this.isDownloaded() && options.force !== true) throw new Error("Video already downloaded! Download with force set to true to overwrite.");

		// eslint-disable-next-line @typescript-eslint/no-empty-function
		const downloadedBytes = await this.fileSize().catch(() => {});

		// Make sure the folder for the video exists
		await fs.mkdir(this.file.split("/").slice(0, -1).join("/"));

		if (settings.extras.downloadArtwork && this.thumbnail) { // If downloading artwork is enabled download it
			// request(video.thumbnail.path).pipe(fs.createWriteStream(`${video.folderPath}${video.title}.${settings.extras.artworkFormat$}`))
			// TODO: Add generic request to fApi
		} // Save the thumbnail with the same name as the video so plex will use it

		if (settings.extras.saveNfo) {
			const nfo = builder.create("episodedetails")
				.ele("title").text(this.title).up()
				.ele("showtitle").text(this.channelTitle).up()
				.ele("description").text(this.description).up()
				.ele("aired").text(this.releaseDate.toString()).up()
				.ele("season").text("1").up()
				.ele("episode").text(this._db.e.toString()).up()
				.end({ pretty: true });
			await fs.writeFile(`${this.file}.nfo`, nfo, "utf8");
		}
		
		// Download video
		const downloadRequest = await fApi.video.download(this.guid, settings.floatplane.videoResolution.toString(), downloadedBytes!==undefined?{ Range: `bytes=${downloadedBytes}-${this._db.s}` }:{});
		downloadRequest.pipe(createWriteStream(this.file, downloadedBytes!==undefined?{ start: downloadedBytes, flags: "r+" }:{}));
		return downloadRequest;
	}
}