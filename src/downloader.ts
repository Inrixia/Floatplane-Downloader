import { MultiProgressBars } from "multi-progress-bars";
import Video from "./lib/Video";

import { settings } from "./lib/helpers";

import { promisify } from "util";
const sleep = promisify(setTimeout);

type promiseFunction = (f: Promise<void>) => void;

const reset = "\u001b[0m";
const cy = (str: string|number) => `\u001b[36;1m${str}\u001b[0m`;
const gr = (str: string|number) => `\u001b[32;1m${str}\u001b[0m`;
const ye = (str: string|number) => `\u001b[33;1m${str}\u001b[0m`;
const bl = (str: string|number) => `\u001b[34;1m${str}\u001b[0m`;

export default class VideoProcessor {
	private mpb?: MultiProgressBars;
	private videoQueue: Array<{ video: Video, res: promiseFunction }>;
	private videosProcessing: number;
	private videosProcessed: number;
	private downloadStats: { [key: string]: { totalMB: number, downloadedMB: number, downloadSpeed: number } };

	private runQueue: boolean;

	constructor () {
		this.videoQueue = [];
		this.videosProcessing = 0;
		this.videosProcessed = 0;
		this.downloadStats = {};

		this.runQueue = false;
	}

	start(): void {
		if (this.runQueue === false) {
			this.runQueue = true;
			this.tickQueue();
		}
	}

	private tickQueue(): void {
		if (this.runQueue === false) return;
		while(this.videoQueue.length > 0 && (settings.downloadThreads === -1 || this.videosProcessing < settings.downloadThreads)) {
			this.videosProcessing++;
			const task = this.videoQueue.pop();
			if (task !== undefined) {
				const processingVideoPromise = this.processVideo(task.video);
				task.res(processingVideoPromise);
				processingVideoPromise.then(() => this.videosProcessing-- && this.videosProcessed++);
			}
		}
		setTimeout(() => this.tickQueue(), 50);
	}

	stop(): void {
		this.runQueue = false;
	}

	processVideos(videos: Video[]): Array<Promise<void>> {
		if (videos.length !== 0) {
			console.log(`> Processing ${videos.length} videos...`);
			this.mpb = new MultiProgressBars({ initMessage: "", anchor: "top" });
			this.downloadStats = {};
			this.videosProcessed = 0;
		}
		const processingPromises = videos.reverse().map(video => new Promise<void>(res => this.videoQueue.push({video, res})));
		// Handler for when all downloads are done.
		if (videos.length !== 0) Promise.all(processingPromises).then(() => this.updateSummaryBar());
		return processingPromises;
	}

	private updateSummaryBar(): void {
		if (this.downloadStats === undefined) return;
		const { totalMB, downloadedMB, downloadSpeed } = Object.values(this.downloadStats).reduce((summary, stats) => {
			for (const key in stats)  { summary[key as keyof typeof stats] += stats[key as keyof typeof stats]; }
			return summary;
		}, { totalMB: 0, downloadedMB: 0, downloadSpeed: 0 });
		// (videos remaining * avg time to download a video)
		const totalVideos = this.videoQueue.length+this.videosProcessed+this.videosProcessing;
		const whitespace = "                        ";
		const processed  = `Processed:        ${ye(this.videosProcessed)}/${ye(totalVideos)}${whitespace}`;
		const downloaded = `Total Downloaded: ${cy(downloadedMB.toFixed(2))}/${cy(totalMB.toFixed(2)+"MB")}${whitespace}`;
		const speed      = `Download Speed:   ${gr((downloadSpeed/1024000).toFixed(2)+"Mb/s")}${whitespace}`;
		process.stdout.write("                                                         ");
		process.stdout.write(`\n${processed}\n${downloaded}\n${speed}\n\n\n`);
	}

	private async processVideo(video: Video, retries = 0, quality: string = settings.floatplane.videoResolution as string): Promise<void> {
		let formattedTitle: string;
		if (video.channel.consoleColor !== undefined) formattedTitle = `${video.channel.consoleColor}${video.channel.title}${reset} - ${video.title}`.slice(0, 32+video.channel.consoleColor.length+reset.length);
		else formattedTitle = `${video.channel.title} - ${video.title}`.slice(0, 32);
	
		if (this.downloadStats !== undefined) while (formattedTitle in this.downloadStats) formattedTitle = ` ${formattedTitle}`.slice(0, 32);

		if (this.mpb === undefined) throw new Error("Progressbar failed to initialize! Cannot continue download");

		this.mpb.addTask(formattedTitle, {
			type: "percentage", 
			barColorFn: str => `${video.channel.consoleColor||""}${str}`
		});

		try {
			// If the video is already downloaded then just mux its metadata
			if (!await video.isMuxed() && !await video.isDownloaded()) {
				const startTime = Date.now();
				const downloadRequest = await video.download(quality);
				downloadRequest.on("downloadProgress", downloadProgress => {
					const totalMB = downloadProgress.total/1024000;
					const downloadedMB = (downloadProgress.transferred/1024000);
					const timeElapsed = (Date.now() - startTime) / 1000;
					const downloadSpeed = downloadProgress.transferred/timeElapsed;
					const downloadETA = (downloadProgress.total / downloadSpeed) - timeElapsed;  // Round to 4 decimals
					if (this.mpb !== undefined) this.mpb.updateTask(formattedTitle, { 
						percentage: downloadProgress.percent, 
						message: `${reset}${cy(downloadedMB.toFixed(2))}/${cy(totalMB.toFixed(2)+"MB")} ${gr((downloadSpeed/1024000).toFixed(2)+"Mb/s")} ETA: ${bl(Math.floor(downloadETA / 60)+"m "+(Math.floor(downloadETA) % 60)+"s")}`
					});
					this.downloadStats[formattedTitle] = { totalMB, downloadedMB, downloadSpeed };
					this.updateSummaryBar();
				});
				await new Promise((res, rej) => {
					downloadRequest.on("end", res);
					downloadRequest.on("error", rej);
				});
				this.downloadStats[formattedTitle].downloadSpeed = 0;
			}
			if (!await video.isMuxed()) {
				this.mpb.updateTask(formattedTitle, { 
					percentage: 0.99, 
					message: "Muxing ffmpeg metadata..."
				});
				await video.muxffmpegMetadata();
			}
			this.mpb.done(formattedTitle);
		} catch (error) {
			// Handle errors when downloading nicely
			this.mpb.updateTask(formattedTitle, { message: `\u001b[31m\u001b[1mERR\u001b[0m: ${error.message}` });
	
			// Retry downloading the video if this is the first failure.
			if (retries === 0) {
				this.mpb.updateTask(formattedTitle, { message: `\u001b[31m\u001b[1mERR\u001b[0m: ${error.message} - Retrying...` });
				await sleep(1000);
				await this.processVideo(video, ++retries);
				return;
			}
	
			// If the server aborted the request retry up to 3 times.
			if (error.message.includes("The server aborted pending request") && retries < 3) {
				this.mpb.updateTask(formattedTitle, { message: `\u001b[31m\u001b[1mERR\u001b[0m: ${error.message} - Retrying ${retries}/3` });
				await sleep(1000);
				await this.processVideo(video, ++retries);
				return;
			}
			return;
		}
	}
}