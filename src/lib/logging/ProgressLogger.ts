import { Counter } from "prom-client";
import type { Progress } from "got";

export interface IProgressLogger {
	readonly title: string;
	log(message: string): void;
	error(message: string): void;
	onDownloadProgress(progress: Progress): void;
	done(message: string): void;
}

export class ProgressLogger {
	public static TotalVideos = 0;
	public static CompletedVideos = 0;

	public static readonly ERR = "\u001b[31m\u001b[1mERR\u001b[0m";

	public downloadedBytes = 0;

	private static _downloadedBytesTotalCounter = new Counter({
		name: "downloaded_bytes_total",
		help: "Video downloaded bytes",
	});

	public onDownloadProgress(progress: Progress) {
		ProgressLogger._downloadedBytesTotalCounter.inc(progress.transferred - this.downloadedBytes);
		this.downloadedBytes = progress.transferred;
	}
}
