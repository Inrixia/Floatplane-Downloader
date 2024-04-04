import { MultiProgressBars } from "multi-progress-bars";
import { ProgressLogger, type IProgressLogger } from "./ProgressLogger.js";

export class ProgressBars extends ProgressLogger implements IProgressLogger {
	private static readonly _reset = "\u001b[0m";
	private static readonly cy = (str: string | number) => `\u001b[36;1m${str}\u001b[0m`;
	private static readonly gr = (str: string | number) => `\u001b[32;1m${str}\u001b[0m`;
	private static readonly ye = (str: string | number) => `\u001b[33;1m${str}\u001b[0m`;
	private static readonly bl = (str: string | number) => `\u001b[34;1m${str}\u001b[0m`;

	private static readonly _Bars: MultiProgressBars = new MultiProgressBars({ initMessage: "", anchor: "bottom" });

	public static TotalBytes = 0;
	public static DownloadedBytes = 0;
	public static DownloadSpeed = 0;

	private _startTime: undefined | number = undefined;

	private _downloadSpeed = 0;
	private reset() {
		ProgressBars.DownloadSpeed -= this._downloadSpeed;
		this._downloadSpeed = 0;
		this.downloadedBytes = 0;
	}

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
	public done() {
		ProgressBars._Bars.done(this.title);
		this.reset();
		setTimeout(() => ProgressBars._Bars.removeTask(this.title), 10000 + Math.floor(Math.random() * 6000));
	}
	public error(message: string) {
		this.log(`${ProgressLogger.ERR}: ${message}`);
		this.reset();
	}

	public onDownloadProgress(progress: { total: number; transferred: number; percent: number }): void {
		ProgressBars.DownloadedBytes += progress.transferred - this.downloadedBytes;
		super.onDownloadProgress(progress);

		if (this._startTime === undefined) {
			this._startTime ??= Date.now();
			ProgressBars.TotalBytes += progress.total;
		}

		const elapsed = (Date.now() - this._startTime) / 1000;

		const downloadSpeed = progress.transferred / elapsed;
		if (!isNaN(downloadSpeed)) {
			ProgressBars.DownloadSpeed += downloadSpeed - this._downloadSpeed;
			this._downloadSpeed = downloadSpeed;
		}

		const downloadETA = progress.total / this._downloadSpeed - elapsed;

		const downloaded = `${ProgressBars.cy((this.downloadedBytes / 1000000).toFixed(2))}/${ProgressBars.cy(`${(progress.total / 1000000).toFixed(2)}MB`)}`;
		const speed = `${ProgressBars.gr((this._downloadSpeed / 125000).toFixed(2) + "mb/s")}`;
		const eta = `ETA: ${ProgressBars.bl(`${Math.floor(downloadETA / 60)}m ${Math.floor(downloadETA) % 60}s`)}`;

		ProgressBars._Bars.updateTask(this.title, {
			percentage: progress.percent,
			message: `${ProgressBars._reset}${downloaded} ${speed} ${eta}`,
		});

		const processed = `Processed:        ${ProgressBars.ye(ProgressBars.CompletedVideos)}/${ProgressBars.ye(ProgressBars.TotalVideos)}`;
		const downloadedTotal = `Total Downloaded: ${ProgressBars.cy((ProgressBars.DownloadedBytes / 1000000).toFixed(2))}/${ProgressBars.cy(
			`${(ProgressBars.TotalBytes / 1000000).toFixed(2)}MB`,
		)}`;
		const speedTotal = `Download Speed:   ${ProgressBars.gr(`${(ProgressBars.DownloadSpeed / 125000).toFixed(2)}mb/s`)}`;
		ProgressBars._Bars.setFooter({
			message: `${processed}    ${downloadedTotal}    ${speedTotal}`,
			pattern: "",
		});
	}
}
