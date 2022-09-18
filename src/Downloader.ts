import { MultiProgressBars, UpdateOptions } from 'multi-progress-bars';
import Video from './lib/Video.js';

import { settings, args } from './lib/helpers.js';

type promiseFunction = (f: Promise<void>) => void;

const reset = '\u001b[0m';
const cy = (str: string | number) => `\u001b[36;1m${str}\u001b[0m`;
const gr = (str: string | number) => `\u001b[32;1m${str}\u001b[0m`;
const ye = (str: string | number) => `\u001b[33;1m${str}\u001b[0m`;
const bl = (str: string | number) => `\u001b[34;1m${str}\u001b[0m`;

export default class Downloader {
	private mpb?: MultiProgressBars;
	private videoQueue: Array<{ video: Video; res: promiseFunction }> = [];
	private videosProcessing: number = 0;
	private videosProcessed: number = 0;
	private summaryStats: { [key: string]: { totalMB: number; downloadedMB: number; downloadSpeed: number } } = {};

	private runQueue: boolean = false;

	start(): void {
		if (this.runQueue === false) {
			this.runQueue = true;
			this.tickQueue();
		}
	}

	private tickQueue(): void {
		if (this.runQueue === false) return;
		while (this.videoQueue.length > 0 && (settings.downloadThreads === -1 || this.videosProcessing < settings.downloadThreads)) {
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
		if (videos.length === 0) return [];

		console.log(`> Processing ${videos.length} videos...`);
		if (args.headless !== true) this.mpb = new MultiProgressBars({ initMessage: '', anchor: 'top' });
		this.summaryStats = {};
		this.videosProcessed = 0;

		const processingPromises = videos.reverse().map((video) => new Promise<void>((res) => this.videoQueue.push({ video, res })));

		// Handler for when all downloads are done.
		Promise.all(processingPromises).then(() => this.updateSummaryBar());
		return processingPromises;
	}

	private updateSummaryBar(): void {
		if (this.summaryStats === undefined) return;
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
		const totalVideos = this.videoQueue.length + this.videosProcessed + this.videosProcessing;
		const processed = `Processed:        ${ye(this.videosProcessed)}/${ye(totalVideos)}`;
		const downloaded = `Total Downloaded: ${cy(downloadedMB.toFixed(2))}/${cy(totalMB.toFixed(2) + 'MB')}`;
		const speed = `Download Speed:   ${gr(((downloadSpeed / 1024000) * 8).toFixed(2) + 'Mb/s')}`;
		this.mpb?.setFooter({
			message: `${processed}    ${downloaded}    ${speed}`,
			pattern: '',
		});
	}

	/**
	 * Updsate the progress bar for a specific video.
	 * @param formattedTitle Title of bar to update.
	 * @param barUpdate Update object to update the bar with.
	 * @param displayNow If the update should be immediately sent to console (Only applied if running in headless mode)
	 */
	private updateBar(formattedTitle: string, barUpdate: UpdateOptions, displayNow = false): void {
		if (args.headless === true) {
			if (displayNow === true && barUpdate.message !== undefined) console.log(`${formattedTitle} - ${barUpdate.message}`);
		} else if (this.mpb !== undefined) this.mpb.updateTask(formattedTitle, barUpdate);
	}

	private async processVideo(video: Video, retries = 0, allowRangeQuery = true): Promise<void> {
		let formattedTitle: string;
		if (args.headless === true) formattedTitle = `${video.channel.title} - ${video.title}`;
		else if (video.channel.consoleColor !== undefined) {
			formattedTitle = `${video.channel.consoleColor}${video.channel.title}${reset} - ${video.title}`.slice(
				0,
				32 + video.channel.consoleColor.length + reset.length
			);
		} else formattedTitle = `${video.channel.title} - ${video.title}`.slice(0, 32);

		if (this.summaryStats !== undefined) while (formattedTitle in this.summaryStats) formattedTitle = `.${formattedTitle}`.slice(0, 32);

		if (args.headless === true) console.log(`${formattedTitle} - Downloading...`);
		else {
			if (this.mpb === undefined) throw new Error('Progressbar failed to initialize! Cannot continue download');
			this.mpb.addTask(formattedTitle, {
				type: 'percentage',
				barTransformFn: (str) => `${video.channel.consoleColor || ''}${str}`,
			});
		}

		try {
			// If the video is already downloaded then just mux its metadata
			if (!(await video.isDownloaded())) {
				const startTime = Date.now();
				const downloadRequests = await video.download(settings.floatplane.videoResolution as string, allowRangeQuery);

				const totalBytes: number[] = [];
				const downloadedBytes: number[] = [];
				const percentage: number[] = [];

				await Promise.all(
					downloadRequests.map(async (request, i) => {
						request.on('downloadProgress', (downloadProgress: { total: number; transferred: number; percent: number }) => {
							const timeElapsed = (Date.now() - startTime) / 1000;

							totalBytes[i] = downloadProgress.total;
							downloadedBytes[i] = downloadProgress.transferred;
							percentage[i] = downloadProgress.percent;

							// Sum the stats for multi part video downloads
							const total = totalBytes.reduce((sum, b) => sum + b, 0);
							const transferred = downloadedBytes.reduce((sum, b) => sum + b, 0);

							const totalMB = total / 1024000;
							const downloadedMB = transferred / 1024000;
							const downloadSpeed = transferred / timeElapsed;
							const downloadETA = total / downloadSpeed - timeElapsed; // Round to 4 decimals

							this.updateBar(formattedTitle, {
								percentage: percentage.reduce((sum, b) => sum + b, 0) / percentage.length,
								message: `${reset}${cy(downloadedMB.toFixed(2))}/${cy(totalMB.toFixed(2) + 'MB')} ${gr(((downloadSpeed / 1024000) * 8).toFixed(2) + 'Mb/s')} ETA: ${bl(
									Math.floor(downloadETA / 60) + 'm ' + (Math.floor(downloadETA) % 60) + 's'
								)}`,
							});
							this.summaryStats[formattedTitle] = { totalMB, downloadedMB, downloadSpeed };
							if (args.headless !== true) this.updateSummaryBar();
						});
						await new Promise((res, rej) => {
							request.on('end', res);
							request.on('error', rej);
						});
					})
				);
				this.summaryStats[formattedTitle].downloadSpeed = 0;
			}
			if (!(await video.isMuxed())) {
				this.updateBar(formattedTitle, {
					percentage: 0.99,
					message: 'Muxing ffmpeg metadata...',
				});
				await video.muxffmpegMetadata();
			}
			if (settings.postProcessingCommand !== '') {
				this.updateBar(formattedTitle, { message: `Running post download command "${settings.postProcessingCommand}"...` });
				await video.postProcessingCommand().catch((err) => console.log(`An error occurred while executing the postProcessingCommand!\n${err.message}\n`));
			}
			if (args.headless === true) {
				this.updateBar(formattedTitle, { message: `Downloaded!` });
				this.updateSummaryBar();
			} else if (this.mpb !== undefined) this.mpb.done(formattedTitle);
		} catch (error) {
			let info;
			if (!(error instanceof Error)) info = new Error(`Something weird happened, whatever was thrown was not a error! ${error}`);
			else info = error;
			// Handle errors when downloading nicely
			if (retries < settings.floatplane.retries) {
				this.updateBar(formattedTitle, { message: `\u001b[31m\u001b[1mERR\u001b[0m: ${info.message} - Retrying ${retries}/${settings.floatplane.retries}` }, true);
				if (info.message.indexOf('Range Not Satisfiable')) await this.processVideo(video, ++retries, false);
				else await this.processVideo(video, ++retries);
			} else
				this.updateBar(
					formattedTitle,
					{ message: `\u001b[31m\u001b[1mERR\u001b[0m: ${info.message} Max Retries! ${retries}/${settings.floatplane.retries}` },
					true
				);
		}
	}
}
