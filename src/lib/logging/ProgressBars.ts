import chalk from "chalk-template";
import type { Progress } from "got";
import { MultiProgressBars, type UpdateOptions } from "multi-progress-bars";
import { args } from "../helpers/index";
import { ProgressLogger, type IProgressLogger } from "./ProgressLogger";

export class ProgressBars extends ProgressLogger implements IProgressLogger {
	// Trigger MPB immediately so console is contained, but only in headless
	private static _Bars: MultiProgressBars = args.headless ? <MultiProgressBars>(<unknown>null) : new MultiProgressBars({ initMessage: "", anchor: "top" });

	public static Total = 0;
	public static Done = 0;
	public static Errors = 0;

	public static TotalBytes = 0;
	public static DownloadedBytes = 0;
	public static DownloadSpeed = 0;

	private _lastTick = 0;
	private _downloadSpeed = 0;

	constructor(title: string) {
		super(title);

		this.title = title.slice(0, 32).trim();
		let i = 1;
		while (ProgressBars._Bars.getIndex(this.title) !== undefined) this.title = `${this.title} [${++i}]`;
		ProgressBars.Total++;
	}
	private updateTask(updateOptions?: UpdateOptions) {
		if (ProgressBars._Bars.getIndex(this.title) === undefined) {
			ProgressBars._Bars.addTask(this.title, { type: "percentage" });
		}
		ProgressBars._Bars.updateTask(this.title, updateOptions);
	}

	public log(message: string) {
		this.updateTask({ message });
	}
	private reset() {
		ProgressBars.DownloadSpeed -= this._downloadSpeed;
		ProgressBars.DownloadSpeed = Math.abs(ProgressBars.DownloadSpeed);
		this._downloadSpeed = 0;
		this.updateSummaryBar();
	}
	public error(err: unknown) {
		ProgressBars.Errors++;
		const errMsg = this.sanitizeError(err);
		const errStatement = chalk`{red ERR}: ${errMsg}`;
		this.log(errStatement);
		return errStatement;
	}
	public done(message: string) {
		ProgressBars.Done += 1;
		this.updateTask(); // Ensure the bar exists
		ProgressBars._Bars.done(this.title, { message });
		this.reset();
		setTimeout(() => ProgressBars._Bars.removeTask(this.title), 5000);
	}

	public onDownloadProgress(progress: Progress, bytesSinceLast: number): void {
		if (progress.total === undefined) return;

		ProgressBars.DownloadedBytes += bytesSinceLast;

		if (this._lastTick === 0) {
			ProgressBars.TotalBytes += progress.total;
			this._lastTick = Date.now();
		}

		const elapsedSinceLastTick = (Date.now() - this._lastTick) / 1000;
		this._lastTick = Date.now();

		const downloadSpeed = bytesSinceLast / elapsedSinceLastTick;
		if (!isNaN(downloadSpeed)) {
			ProgressBars.DownloadSpeed += downloadSpeed - this._downloadSpeed;
			this._downloadSpeed = downloadSpeed;
		}

		const downloadETA = progress.total / this._downloadSpeed - elapsedSinceLastTick;

		const downloaded = chalk`{cyan ${(progress.transferred / 1000000).toFixed(2)}}/{cyan ${(progress.total / 1000000).toFixed(2)}MB}`;
		const speed = chalk`{green ${(this._downloadSpeed / 125000).toFixed(2)} mb/s}`;
		const eta = chalk`ETA: {blue ${Math.floor(downloadETA / 60)}m ${Math.floor(downloadETA) % 60}s}`;

		this.updateTask({
			percentage: progress.percent,
			message: `${downloaded} ${speed} ${eta}`,
		});

		this.updateSummaryBar();
	}

	private updateSummaryBar() {
		const processed = chalk`Processed: {yellow ${ProgressBars.Done}}/{yellow ${ProgressBars.Total}} Errors: {red ${ProgressBars.Errors}}`;
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
