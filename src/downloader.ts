import { MultiProgressBars } from "multi-progress-bars";
import Video from "./lib/Video";

import { settings } from "./lib/helpers";

import { fApi } from "./lib/FloatplaneAPI";

type promiseFunction = (f: Promise<void>) => void;
const videoDownloadQueue: {video: Video, res: promiseFunction }[] = [];
let videosDownloading = 0;

let mpb: MultiProgressBars;

setInterval(() => {
	while(videoDownloadQueue.length > 0 && settings.downloadThreads === -1 || videosDownloading < settings.downloadThreads) {
		videosDownloading++;
		const task = videoDownloadQueue.pop();
		if (task !== undefined) {
			const downloadingVideoPromise = downloadVideo(task.video);
			task.res(downloadingVideoPromise);
			downloadingVideoPromise.then(() => videosDownloading--);
		}
	}
}, 50);

export const downloadVideos = (videos: Video[]): Array<Promise<void>> => {
	if (videos.length !== 0) mpb = new MultiProgressBars({ 
		initMessage: "Downloading Videos",
		anchor: "bottom",
		persist: false,
		stream: process.stderr
	});
	const allVideos = videos.map(video => new Promise<void>(res => videoDownloadQueue.push({video, res })));
	return allVideos;
};

const downloadVideo = async (video: Video) => {
	const startTime = Date.now();
	const coloredTitle = `${video.title}`;
	mpb.addTask(coloredTitle, { 
		type: "percentage", 
		barColorFn: str => `${settings.colourList[video.channel.title]||""}${str}` 
	});
	const downloadRequest = await video.download(fApi);
	downloadRequest.on("downloadProgress", downloadProgress => {
		const totalMB = downloadProgress.total/1024000;
		const downloadedMB = (downloadProgress.transferred/1024000);
		const timeElapsed = (Date.now() - startTime) / 1000;
		const downloadSpeed = downloadProgress.transferred/timeElapsed;
		const downloadETA = (downloadProgress.total / downloadSpeed) - timeElapsed;  // Round to 4 decimals
		mpb.updateTask(coloredTitle, { 
			percentage: downloadProgress.percent, 
			message: `${downloadedMB.toFixed(2)}/${totalMB.toFixed(2)}MB, ${(downloadSpeed/1024000).toFixed(2)}Mb/s ETA: ${Math.floor(downloadETA / 60)}m ${Math.floor(downloadETA) % 60}s`
		});	
	});
	await new Promise((res, rej) => {
		downloadRequest.on("end", res);
		downloadRequest.on("error", rej);
	});
	mpb.done(coloredTitle);
	await video.addffmpegMetadata();
	await video.markDownloaded();
};
