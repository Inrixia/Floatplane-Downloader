import { MultiProgressBars } from "multi-progress-bars";
import Video from "./lib/Video";

import { settings } from "./lib/helpers";

import { fApi } from "./lib/FloatplaneAPI";

import { Resolution } from "./lib/types";

import { promisify } from "util";
const sleep = promisify(setTimeout);

type promiseFunction = (f: Promise<void>) => void;
const videoQueue: {video: Video, res: promiseFunction }[] = [];
let videosProcessing = 0;
let videosProcessed = 0;

let mpb: MultiProgressBars;
let downloadStats: { [key: string]: { totalMB: number, downloadedMB: number, downloadSpeed: number, timeElapsed: number } };

setInterval(() => {
	while(videoQueue.length > 0 && (settings.downloadThreads === -1 || videosProcessing < settings.downloadThreads)) {
		videosProcessing++;
		const task = videoQueue.pop();
		if (task !== undefined) {
			const processingVideoPromise = processVideo(task.video);
			task.res(processingVideoPromise);
			processingVideoPromise.then(() => videosProcessing-- && videosProcessed++);
		}
	}
}, 50);

export const processVideos = (videos: Video[]): Array<Promise<void>> => {
	if (videos.length !== 0) {
		console.log(`> Processing ${videos.length} videos...`);
		mpb = new MultiProgressBars({ initMessage: "", anchor: "top" });
		downloadStats = {};
		videosProcessed = 0;
	}
	const processingPromises = videos.map(video => new Promise<void>(res => videoQueue.push({video, res })));
	// Handler for when all downloads are done.
	if (videos.length !== 0) {
		Promise.all(processingPromises).then(updateSummaryBar);
	}
	return processingPromises;
};

const reset = "\u001b[0m";
const cy = (str: string|number) => `\u001b[36;1m${str}\u001b[0m`;
const gr = (str: string|number) => `\u001b[32;1m${str}\u001b[0m`;
const ye = (str: string|number) => `\u001b[33;1m${str}\u001b[0m`;
const bl = (str: string|number) => `\u001b[34;1m${str}\u001b[0m`;

const updateSummaryBar = () => {
	const { totalMB, downloadedMB, downloadSpeed, timeElapsed } = Object.values(downloadStats).reduce((summary, stats) => {
		for (const key in stats)  { summary[key as keyof typeof stats] += stats[key as keyof typeof stats]; }
		return summary;
	}, { totalMB: 0, downloadedMB: 0, downloadSpeed: 0, timeElapsed: 0});
	// (videos remaining * avg time to download a video)
	const totalVideos = videoQueue.length+videosProcessed+videosProcessing;
	const summaryDownloadETA = (videoQueue.length+videosProcessing) * (timeElapsed/videosProcessed);
	const whitespace = "                        ";
	const processed  = `Processed:        ${ye(videosProcessed)}/${ye(totalVideos)}${whitespace}`;
	const downloaded = `Total Downloaded: ${cy(downloadedMB.toFixed(2))}/${cy(totalMB.toFixed(2)+"MB")}${whitespace}`;
	const speed      = `Download Speed:   ${gr((downloadSpeed/1024000).toFixed(2)+"Mb/s")}${whitespace}`;
	const eta 		 = `Rough ETA:        ${bl(Math.floor(summaryDownloadETA / 60))} minutes${whitespace}`;
	process.stdout.write("                                                         ");
	process.stdout.write(`\n${processed}\n${downloaded}\n${speed}\n${isNaN(summaryDownloadETA)?"":eta}\n\n\n`);
};

const processVideo = async (video: Video, retries = 0, quality: Resolution = settings.floatplane.videoResolution) => {
	const channelColor = settings.colourList[video.channel.title]||"";
	let coloredTitle: string;
	if (channelColor !== "") coloredTitle = `${channelColor}${video.channel.title}${reset} - ${video.title}`.slice(0, 32+channelColor.length+reset.length);
	else coloredTitle = `${video.channel.title} - ${video.title}`.slice(0, 32);
	while (coloredTitle in downloadStats) coloredTitle = ` ${coloredTitle}`.slice(0, 32);
	mpb.addTask(coloredTitle, {
		type: "percentage", 
		barColorFn: str => `${channelColor}${str}`
	});
	try {
		// If the video is already downloaded then just mux its metadata
		if (!await video.isDownloaded()) {
			const startTime = Date.now();
			const downloadRequest = await video.download(fApi, quality.toString());
			downloadRequest.on("downloadProgress", downloadProgress => {
				const totalMB = downloadProgress.total/1024000;
				const downloadedMB = (downloadProgress.transferred/1024000);
				const timeElapsed = (Date.now() - startTime) / 1000;
				const downloadSpeed = downloadProgress.transferred/timeElapsed;
				const downloadETA = (downloadProgress.total / downloadSpeed) - timeElapsed;  // Round to 4 decimals
				mpb.updateTask(coloredTitle, { 
					percentage: downloadProgress.percent, 
					message: `${reset}${cy(downloadedMB.toFixed(2))}/${cy(totalMB.toFixed(2)+"MB")} ${gr((downloadSpeed/1024000).toFixed(2)+"Mb/s")} ETA: ${bl(Math.floor(downloadETA / 60)+"m "+(Math.floor(downloadETA) % 60)+"s")}`
				});
				downloadStats[coloredTitle] = { totalMB, downloadedMB, downloadSpeed, timeElapsed: 0 };
				updateSummaryBar();
			});
			await new Promise((res, rej) => {
				downloadRequest.on("end", res);
				downloadRequest.on("error", rej);
			});
			downloadStats[coloredTitle].timeElapsed = (Date.now() - startTime) / 1000;
			downloadStats[coloredTitle].downloadSpeed = 0;
		}
		mpb.updateTask(coloredTitle, { 
			percentage: 0.99, 
			message: "Muxing ffmpeg metadata..."
		});
		await video.muxffmpegMetadata();
		mpb.done(coloredTitle);
	} catch (error) {
		// Handle errors when downloading nicely
		mpb.updateTask(coloredTitle, { message: `\u001b[31m\u001b[1mERR\u001b[0m: ${error.message}` });

		// Retry downloading the video if this is the first failure.
		if (retries === 0) {
			mpb.updateTask(coloredTitle, { message: `\u001b[31m\u001b[1mERR\u001b[0m: ${error.message} - Retrying...` });
			await sleep(1000);
			await processVideo(video, ++retries);
			return;
		}

		// If the server aborted the request retry up to 3 times.
		if (error.message.includes("The server aborted pending request") && retries < 3) {
			mpb.updateTask(coloredTitle, { message: `\u001b[31m\u001b[1mERR\u001b[0m: ${error.message} - Retrying ${retries}/3` });
			await sleep(1000);
			await processVideo(video, ++retries);
			return;
		}

		if (error.message.includes("Response code 400") || error.message.includes("Response code 404")) {
			// Drop down the qualities until one works or give up
			const currentResIndex = settings.floatplane._avalibleResolutions.indexOf(quality);
			if (currentResIndex !== 0) {
				const newRes = settings.floatplane._avalibleResolutions[currentResIndex-1];
				mpb.updateTask(coloredTitle, { message: `\u001b[31m\u001b[1mERR\u001b[0m: ${error.message} - Retrying at ${newRes}p` });
				await sleep(1000);
				await processVideo(video, retries, newRes);
				return;
			}
		}
		return;
	}
};
