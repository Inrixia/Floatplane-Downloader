import db from "@inrixia/db";
import { nPad, ValueOfA } from "@inrixia/helpers";
import sanitize from "sanitize-filename";
import { args, settings } from "./helpers/index";

import { basename, dirname, extname } from "path";

import { readdir, rename, unlink } from "fs/promises";
import { nll } from "./logging/ProgressLogger";

type AttachmentInfo = {
	partialBytes?: number;
	muxedBytes?: number;
	muxed?: boolean;
	filePath: string;
	releaseDate: number;
	videoTitle: string;
	channelTitle: string;
};

type AttachmentAttributes = {
	attachmentId: string;
	videoTitle: string;
	channelTitle: string;
	releaseDate: Date;
};

enum Extensions {
	Muxed = ".mp4",
	Partial = ".partial",
	NFO = ".nfo",
	Thumbnail = ".png",
}

export class Attachment implements AttachmentAttributes {
	private static readonly AttachmentsDB: Record<string, AttachmentInfo> = db<Record<string, AttachmentInfo>>(`${args.dbPath}/attachments.json`);
	public static readonly Extensions = Extensions;

	public readonly attachmentId: string;
	public readonly channelTitle: string;
	public readonly videoTitle: string;
	public readonly releaseDate: Date;

	public readonly filePath: string;
	public readonly folderPath: string;

	public readonly artworkPath: string;
	public readonly nfoPath: string;
	public readonly partialPath: string;
	public readonly muxedPath: string;

	constructor({ attachmentId, channelTitle, videoTitle, releaseDate }: AttachmentAttributes) {
		this.attachmentId = attachmentId;
		this.channelTitle = channelTitle;
		this.releaseDate = releaseDate;
		this.videoTitle = videoTitle;

		this.filePath = this.formatFilePath(settings.filePathFormatting);

		// Ensure filePath is not exceeding maximum length
		if (this.filePath.length > 250) this.filePath = this.filePath.substring(0, 250);

		this.folderPath = this.filePath.substring(0, this.filePath.lastIndexOf("/"));

		this.artworkPath = `${this.filePath}${settings.artworkSuffix}`;
		this.nfoPath = `${this.filePath}${Extensions.NFO}`;
		this.partialPath = `${this.filePath}${Extensions.Partial}`;
		this.muxedPath = `${this.filePath}${Extensions.Muxed}`;

		const attachmentInfo = (Attachment.AttachmentsDB[this.attachmentId] ??= {
			releaseDate: this.releaseDate.getTime(),
			filePath: this.filePath,
			videoTitle: this.videoTitle,
			channelTitle: this.channelTitle,
		});
		// If the attachment existed on another path then move it.
		if (attachmentInfo.filePath !== this.filePath) {
			rename(this.artworkPath.replace(this.filePath, attachmentInfo.filePath), this.artworkPath).catch(nll);
			rename(this.partialPath.replace(this.filePath, attachmentInfo.filePath), this.partialPath).catch(nll);
			rename(this.muxedPath.replace(this.filePath, attachmentInfo.filePath), this.muxedPath).catch(nll);
			rename(this.nfoPath.replace(this.filePath, attachmentInfo.filePath), this.nfoPath).catch(nll);
			attachmentInfo.filePath = this.filePath;
		}
		if (attachmentInfo.videoTitle !== this.videoTitle) attachmentInfo.videoTitle = this.videoTitle;
	}

	public static find(filter: (attachment: AttachmentInfo) => boolean) {
		return Object.entries(this.AttachmentsDB)
			.map(([attachmentId, attachmentInfo]) => ({
				attachmentId,
				...attachmentInfo,
			}))
			.filter(filter);
	}

	public attachmentInfo(): AttachmentInfo {
		return Attachment.AttachmentsDB[this.attachmentId];
	}
	public async delete() {
		await Promise.allSettled([unlink(this.partialPath), unlink(this.muxedPath), unlink(this.nfoPath), unlink(this.artworkPath)]);
		delete Attachment.AttachmentsDB[this.attachmentId];
	}

	public static FilePathOptions = ["%channelTitle%", "%year%", "%month%", "%day%", "%hour%", "%minute%", "%second%", "%videoTitle%"] as const;
	protected formatFilePath(string: string): string {
		const formatLookup: Record<ValueOfA<typeof Attachment.FilePathOptions>, string> = {
			"%channelTitle%": sanitize(this.channelTitle),
			"%year%": this.releaseDate.getFullYear().toString(),
			"%month%": nPad(this.releaseDate.getMonth() + 1),
			"%day%": nPad(this.releaseDate.getDate()),
			"%hour%": nPad(this.releaseDate.getHours()),
			"%minute%": nPad(this.releaseDate.getMinutes()),
			"%second%": nPad(this.releaseDate.getSeconds()),
			"%videoTitle%": sanitize(this.videoTitle.replace(/ - /g, " ").replace(/\//g, " ").replace(/\\/g, " ")),
		};

		for (const [match, value] of Object.entries(formatLookup)) {
			string = string.replace(new RegExp(match, "g"), value);
		}
		return string;
	}

	public async artworkFileExtension() {
		const fileDir = dirname(this.artworkPath);
		const fileName = basename(this.artworkPath);

		const filesInDir = await readdir(fileDir);
		const matchingFile = filesInDir.find(
			(file) => file.startsWith(fileName) && !file.endsWith(Extensions.NFO) && !file.endsWith(Extensions.Partial) && !file.endsWith(Extensions.Muxed)
		);
		if (matchingFile) return extname(matchingFile);
		return undefined;
	}
}
