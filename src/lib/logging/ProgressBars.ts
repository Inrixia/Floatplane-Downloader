import { MultiProgressBars } from "multi-progress-bars";
import { ProgressLogger, type IProgressLogger } from "./ProgressLogger.js";
import type { Progress } from "got";
import chalk from "chalk";

export class ProgressBars extends ProgressLogger implements IProgressLogger {
	private static _Bars: MultiProgressBars;

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
		if (ProgressBars._Bars === undefined) ProgressBars._Bars = new MultiProgressBars({ initMessage: "", anchor: "bottom" });

		this.title = title.slice(0, 32).trim();
		let i = 1;
		while (ProgressBars._Bars.getIndex(this.title) !== undefined) this.title = `${title.trim().slice(0, 32).trim()} [${++i}]`;
		ProgressBars.Total++;
	}

	public start() {
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
		this.updateSummaryBar();
	}
	public error(message: string) {
		this.log(chalk`{red ERR}: ${message}`);
		this.reset();
		ProgressBars.Errors++;
	}
	public done(message: string) {
		ProgressBars._Bars.done(this.title, { message });
		this.reset();
		ProgressBars.Done += 1;
		this.updateSummaryBar();
		setTimeout(() => ProgressBars._Bars.removeTask(this.title), 10000 + Math.floor(Math.random() * 6000));
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

		ProgressBars._Bars.updateTask(this.title, {
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
