import { MultiProgressBars } from "multi-progress-bars";
import { ProgressLogger, type IProgressLogger } from "./ProgressLogger.js";
import type { Progress } from "got";
import chalk from "chalk-template";
import { args } from "../helpers/index.js";

export class ProgressBars extends ProgressLogger implements IProgressLogger {
	// Ensure that MultiProgressBars is never instantiated if headless
	private static readonly _Bars: MultiProgressBars = args.headless
		? <MultiProgressBars>(<unknown>null)
		: new MultiProgressBars({ initMessage: "", anchor: "bottom" });

	public static TotalBytes = 0;
	public static DownloadedBytes = 0;
	public static DownloadSpeed = 0;
	public static Errors = 0;

	private _lastTick = 0;

	private _downloadSpeed = 0;

	readonly title: string;
	constructor(title: string) {
		super();
		this.title = title.trim().slice(0, 32).trim();
		let i = 1;
		while (ProgressBars._Bars.getIndex(this.title) !== undefined) this.title = `${title.trim().slice(0, 32).trim()} [${++i}]`;
		ProgressBars._Bars.addTask(this.title, { type: "percentage" });
		ProgressBars._Bars.updateTask(this.title, { percentage: 0 });
	}

	public log(message: string) {
		ProgressBars._Bars.updateTask(this.title, { message });
	}
	private reset() {
		ProgressBars.DownloadSpeed -= this._downloadSpeed;
		ProgressBars.DownloadSpeed = Math.abs(ProgressBars.DownloadSpeed);
		this._downloadSpeed = 0;
		this.downloadedBytes = 0;
		this.updateSummaryBar();
	}
	public done() {
		ProgressBars._Bars.done(this.title);
		this.reset();
		this.removeBar();
	}
	public error(message: string, final?: true) {
		this.log(chalk`{red ERR}: ${message}`);
		this.reset();
		if (final) {
			this.removeBar();
			ProgressBars.Errors++;
		}
	}
	private removeBar() {
		setTimeout(() => ProgressBars._Bars.removeTask(this.title), 10000 + Math.floor(Math.random() * 6000));
	}

	public onDownloadProgress(progress: Progress): void {
		if (progress.total === undefined) return;

		const bytesSinceLastTick = progress.transferred - this.downloadedBytes;
		ProgressBars.DownloadedBytes += bytesSinceLastTick;
		super.onDownloadProgress(progress);

		if (this._lastTick === 0) {
			ProgressBars.TotalBytes += progress.total;
			this._lastTick = Date.now();
		}

		const elapsedSinceLastTick = (Date.now() - this._lastTick) / 1000;
		this._lastTick = Date.now();

		const downloadSpeed = bytesSinceLastTick / elapsedSinceLastTick;
		if (!isNaN(downloadSpeed)) {
			ProgressBars.DownloadSpeed += downloadSpeed - this._downloadSpeed;
			this._downloadSpeed = downloadSpeed;
		}

		const downloadETA = progress.total / this._downloadSpeed - elapsedSinceLastTick;

		const downloaded = chalk`{cyan ${(progress.transferred / 1000000).toFixed(2)}}/{cyan ${(progress.total / 1000000).toFixed(2)}MB}`;
		const speed = chalk`{green ${(this._downloadSpeed / 125000).toFixed(2)} mb/s}`;
		const eta = chalk`ETA: {blue ${Math.floor(downloadETA / 60)}m ${Math.floor(downloadETA) % 60}s}`;

		ProgressBars._Bars.updateTask(this.title, {
			percentage: progress.percent,
			message: `${downloaded} ${speed} ${eta}`,
		});

		this.updateSummaryBar();
	}

	private updateSummaryBar() {
		const processed = chalk`Processed: {yellow ${ProgressBars.CompletedVideos}}/{yellow ${ProgressBars.TotalVideos}} Errors: {red ${ProgressBars.Errors}}`;
		const downloadedTotal = chalk`Total Downloaded: {cyan ${(ProgressBars.DownloadedBytes / 1000000).toFixed(2)}}/{cyan ${(
			ProgressBars.TotalBytes / 1000000
		).toFixed(2)}MB}`;
		const speedTotal = chalk`Download Speed: {green ${(ProgressBars.DownloadSpeed / 125000).toFixed(2)}mb/s}`;
		ProgressBars._Bars.setFooter({
			message: `${processed} ${downloadedTotal} ${speedTotal}`,
			pattern: "",
		});
	}
}
