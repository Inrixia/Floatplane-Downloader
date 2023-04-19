import { MultiProgressBars, UpdateOptions } from "multi-progress-bars";
import Video from "./lib/Video.js";

import { settings, args } from "./lib/helpers.js";

import { promisify } from "util";
const sleep = promisify(setTimeout);

type promiseFunction = (f: Promise<void>) => void;

const reset = "\u001b[0m";
const cy = (str: string | number) => `\u001b[36;1m${str}\u001b[0m`;
const gr = (str: string | number) => `\u001b[32;1m${str}\u001b[0m`;
const ye = (str: string | number) => `\u001b[33;1m${str}\u001b[0m`;
const bl = (str: string | number) => `\u001b[34;1m${str}\u001b[0m`;

type DownloadProgress = { total: number; transferred: number; percent: number };
type Task = { video: Video; res: promiseFunction; formattedTitle: string };

const MaxRetries = 5;
const DownloadThreads = 16;

// Ew, I really need to refactor this monster of a class

export default class Downloader {
	private mpb?: MultiProgressBars;
	private taskQueue: Task[] = [];
	private videosProcessing = 0;
	private videosProcessed = 0;
	private summaryStats: { [key: string]: { totalMB: number; downloadedMB: number; downloadSpeed: number } } = {};

	private runQueue = false;

	start(): void {
		if (this.mpb === undefined && args.headless !== true) this.mpb = new MultiProgressBars({ initMessage: "", anchor: "top" });
		if (this.runQueue === false) {
			this.runQueue = true;
			this.tickQueue();
		}
	}

	private tickQueue(): void {
		if (this.runQueue === false) return;
		while (this.taskQueue.length !== 0 && this.videosProcessing < DownloadThreads) {
			this.videosProcessing++;
			const task = this.taskQueue.pop();
			if (task !== undefined) {
				const processingVideoPromise = this.processVideo(task);
				task.res(processingVideoPromise);
				processingVideoPromise.then(() => this.videosProcessing-- && this.videosProcessed++ && this.updateSummaryBar());
			}
		}
		setTimeout(() => this.tickQueue(), 50);
	}

	stop(): void {
		this.runQueue = false;
	}

	processVideos(videos: Video[]): Array<Promise<void>> {
		if (videos.length === 0) return [];

		console.log(`> Processing ${videos.length} videos...`);
		this.summaryStats = {};
		this.videosProcessed = 0;

		const processingPromises = videos
			.reverse()
			.map((video) => new Promise<void>((res) => this.taskQueue.push({ video, res, formattedTitle: this.formatTitle(video) })));

		// Handler for when all downloads are done.
		Promise.all(processingPromises).then(this.updateSummaryBar.bind(this));
		return processingPromises;
	}

	private updateSummaryBar(): void {
		if (this.summaryStats === undefined || args.headless === true) return;
		const { totalMB, downloadedMB, downloadSpeed } = Object.values(this.summaryStats).reduce(
			(summary, stats) => {
				for (const key in stats) {
					summary[key as keyof typeof stats] += stats[key as keyof typeof stats];
				}
				return summary;
			},
			{ totalMB: 0, downloadedMB: 0, downloadSpeed: 0 }
		);
		// (videos remaining * avg time to download a video)
		const totalVideos = this.taskQueue.length + this.videosProcessed + this.videosProcessing;
		const processed = `Processed:        ${ye(this.videosProcessed)}/${ye(totalVideos)}`;
		const downloaded = `Total Downloaded: ${cy(downloadedMB.toFixed(2))}/${cy(totalMB.toFixed(2) + "MB")}`;
		const speed = `Download Speed:   ${gr(((downloadSpeed / 1024000) * 8).toFixed(2) + "mb/s")}`;
		this.mpb?.setFooter({
			message: `${processed}    ${downloaded}    ${speed}`,
			pattern: "",
		});
	}

	/**
	 * Log the progress bar for a specific video.
	 * @param formattedTitle Title of bar to update.
	 * @param barUpdate Update object to update the bar with.
	 * @param displayNow If the update should be immediately sent to console (Only applied if running in headless mode)
	 */
	private log(formattedTitle: string, barUpdate: UpdateOptions, displayNow = false): void {
		if (args.headless === true) {
			if (displayNow === true && barUpdate.message !== undefined) console.log(`${formattedTitle} - ${barUpdate.message}`);
		} else this.mpb?.updateTask(formattedTitle, barUpdate);
	}

	private formatTitle(video: Video) {
		let formattedTitle: string;
		if (args.headless === true) formattedTitle = `${video.channel.title} - ${video.title}`;
		else formattedTitle = `${video.channel.title} - ${video.title}`.slice(0, 32);

		if (this.summaryStats !== undefined) while (formattedTitle in this.summaryStats) formattedTitle = `.${formattedTitle}`.slice(0, 32);

		return formattedTitle;
	}

	private async processVideo(task: Task, retries = 0): Promise<void> {
		const { video, formattedTitle } = task;
		if (args.headless === true) console.log(`${formattedTitle} - Downloading...`);
		else {
			this.mpb?.addTask(formattedTitle, {
				type: "percentage",
				message: "Download Starting...",
			});
		}

		try {
			if (settings.extras.saveNfo) await video.saveNfo();
			if (settings.extras.downloadArtwork) await video.downloadArtwork();
			// If the video is already downloaded then just mux its metadata
			if (!(await video.isDownloaded())) {
				const startTime = Date.now();

				const totalBytes: number[] = [];
				const downloadedBytes: number[] = [];
				const percentage: number[] = [];

				const downloadPromises: Promise<void>[] = [];

				this.mpb?.addTask(formattedTitle, {
					type: "percentage",
					message: "Waiting on delivery cdn...",
				});

				const getStats = () => {
					const timeElapsed = (Date.now() - startTime) / 1000;

					// Sum the stats for multi part video downloads
					const total = totalBytes.reduce((sum, b) => sum + b, 0);
					const transferred = downloadedBytes.reduce((sum, b) => sum + b, 0);

					const totalMB = total / 1024000;
					const downloadedMB = transferred / 1024000;
					const downloadSpeed = transferred / timeElapsed;
					const downloadETA = total / downloadSpeed - timeElapsed; // Round to 4 decimals

					return { totalMB, downloadedMB, downloadSpeed, downloadETA };
				};

				let i = 0;
				for await (const downloadRequest of video.download(settings.floatplane.videoResolution)) {
					downloadRequest.on("end", () => {
						const { totalMB, downloadedMB } = getStats();
						this.log(formattedTitle, {
							percentage: percentage.reduce((sum, b) => sum + b, 0) / percentage.length,
							message: `${reset}${cy(downloadedMB.toFixed(2))}/${cy(totalMB.toFixed(2) + "MB")} - Waiting on delivery cdn...`,
						});
					});

					((index) =>
						downloadRequest.on("downloadProgress", (downloadProgress: DownloadProgress) => {
							totalBytes[index] = downloadProgress.total;
							downloadedBytes[index] = downloadProgress.transferred;
							percentage[index] = downloadProgress.percent;

							const { totalMB, downloadedMB, downloadSpeed, downloadETA } = getStats();

							this.log(formattedTitle, {
								percentage: percentage.reduce((sum, b) => sum + b, 0) / percentage.length,
								message: `${reset}${cy(downloadedMB.toFixed(2))}/${cy(totalMB.toFixed(2) + "MB")} ${gr(((downloadSpeed / 1024000) * 8).toFixed(2) + "mb/s")} ETA: ${bl(
									Math.floor(downloadETA / 60) + "m " + (Math.floor(downloadETA) % 60) + "s"
								)}`,
							});
							this.summaryStats[formattedTitle] = { totalMB, downloadedMB, downloadSpeed };
							this.updateSummaryBar();
						}))(i++);

					downloadPromises.push(
						new Promise((res, rej) => {
							downloadRequest.on("end", res);
							downloadRequest.on("error", rej);
						})
					);
				}

				await Promise.all(downloadPromises);
				this.summaryStats[formattedTitle].downloadSpeed = 0;
			}
			if (!(await video.isMuxed())) {
				this.log(formattedTitle, {
					percentage: 0.99,
					message: "Muxing ffmpeg metadata...",
				});
				await video.muxffmpegMetadata();
			}
			if (settings.postProcessingCommand !== "") {
				this.log(formattedTitle, { message: `Running post download command "${settings.postProcessingCommand}"...` });
				await video.postProcessingCommand().catch((err) => console.log(`An error occurred while executing the postProcessingCommand!\n${err.message}\n`));
			}
			if (args.headless === true) {
				this.log(formattedTitle, { message: `Downloaded!` });
			} else {
				this.mpb?.done(formattedTitle);
				setTimeout(() => this.mpb?.removeTask(formattedTitle), 5000);
			}
			this.updateSummaryBar();
		} catch (error) {
			let info;
			if (!(error instanceof Error)) info = new Error(`Something weird happened, whatever was thrown was not a error! ${error}`);
			else info = error;
			// Handle errors when downloading nicely
			if (retries < MaxRetries) {
				this.log(formattedTitle, { message: `\u001b[31m\u001b[1mERR\u001b[0m: ${info.message} - Retrying in ${retries}s [${retries}/${MaxRetries}]` }, true);

				// Wait between retries
				await sleep(1000 * (retries + 1));

				await this.processVideo(task, ++retries);
			} else this.log(formattedTitle, { message: `\u001b[31m\u001b[1mERR\u001b[0m: ${info.message} Max Retries! [${retries}/${MaxRetries}]` }, true);
		}
	}
}
