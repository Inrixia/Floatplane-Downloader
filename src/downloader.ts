import { MultiProgressBars } from "multi-progress-bars";
import Video from "./lib/Video";

import { settings } from "./lib/helpers";

import { fApi } from "./lib/FloatplaneAPI";

type promiseFunction = (f: Promise<void>) => void;
const videoQueue: {video: Video, res: promiseFunction }[] = [];
let videosProcessing = 0;

let mpb: MultiProgressBars;

setInterval(() => {
	while(videoQueue.length > 0 && settings.downloadThreads === -1 || videosProcessing < settings.downloadThreads) {
		videosProcessing++;
		const task = videoQueue.pop();
		if (task !== undefined) {
			const processingVideoPromise = processVideo(task.video);
			task.res(processingVideoPromise);
			processingVideoPromise.then(() => videosProcessing--);
		}
	}
}, 50);

export const processVideos = (videos: Video[]): Array<Promise<void>> => {
	if (videos.length !== 0) mpb = new MultiProgressBars({ 
		initMessage: "Downloading Videos",
		anchor: "bottom",
		persist: false,
		stream: process.stderr
	});
	const allVideos = videos.map(video => new Promise<void>(res => videoQueue.push({video, res })));
	return allVideos;
};

const processVideo = async (video: Video) => {
	const coloredTitle = `${video.channel.title} - ${video.title}`;
	mpb.addTask(coloredTitle, { 
		type: "percentage", 
		barColorFn: str => `${settings.colourList[video.channel.title]||""}${str}` 
	});
	// If the video is already downloaded then just mux its metadata
	if (!await video.isDownloaded()) {
		const startTime = Date.now();
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
	}
	mpb.updateTask(coloredTitle, { 
		percentage: 0.99, 
		message: "Muxing ffmpeg metadata..."
	});
	await video.muxffmpegMetadata();
	mpb.done(coloredTitle);
};
