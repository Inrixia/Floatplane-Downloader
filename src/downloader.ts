import readline from "readline";
import Multiprogress from "multi-progress";
import Video from "./lib/Video";

import { settings } from "./lib/helpers";

import { fApi } from "./lib/FloatplaneAPI";

type promiseFunction = (f: Promise<void>) => void;
const videoDownloadQueue: {video: Video, res: promiseFunction }[] = [];
let videosDownloading = 0;

const multi = new Multiprogress(process.stderr);

setInterval(() => {
	while(videoDownloadQueue.length > 0 && settings.downloadThreads === -1 || videosDownloading < settings.downloadThreads) {
		videosDownloading++;
		const task = videoDownloadQueue.pop();
		if (task !== undefined) task.res(downloadVideo(task.video));
	}
}, 50);

if (process.platform === "win32") {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	rl.on("SIGINT", () => process.emit("SIGINT" as "disconnect"));
}

const cleanBars = () => multi.newBar("", { complete: "", incomplete: "", width: 0, total: 0 }).interrupt("");

let downloadsStarted = false;
process.on("SIGINT", () => {
	if (downloadsStarted) cleanBars();
	process.exit();
});

export const downloadVideos = (videos: Video[]): Array<Promise<void>> => {
	downloadsStarted = true;
	// No matter where we are on the video todo list return to below the output.
	const allVideos = videos.map(video => new Promise<void>(res => videoDownloadQueue.push({video, res })));
	// Newline at the end to make sure future console.logs write to a fresh line.
	Promise.all(allVideos).then(() => {
		downloadsStarted = false; 
		cleanBars();
	});
	return allVideos;
};

const downloadVideo = async (video: Video) => {
	const bar = multi.newBar(`${settings.colourList[video.channel.title]}${video.title}\u001b[0m [:bar] :percent :stats`, {
		complete: `${settings.colourList[video.channel.title]}█\u001b[0m`,
		incomplete: " ",
		width: 30,
		total: 100
	});
	const startTime = Date.now();
	const downloadRequest = await video.download(fApi);
	downloadRequest.on("downloadProgress", downloadProgress => {
		const totalMB = downloadProgress.total/1024000;
		const downloadedMB = (downloadProgress.transferred/1024000);
		const timeElapsed = (Date.now() - startTime) / 1000;
		const downloadSpeed = downloadProgress.transferred/timeElapsed;
		const downloadETA = (downloadProgress.total / downloadSpeed) - timeElapsed;  // Round to 4 decimals
		bar.update(downloadProgress.percent);
		bar.tick({ title: video.title, stats: `${downloadedMB.toFixed(2)}/${totalMB.toFixed(2)}MB, ${(downloadSpeed/1024000).toFixed(2)}Mb/s ETA: ${Math.floor(downloadETA / 60)}m ${Math.floor(downloadETA) % 60}s` });
	});
	await new Promise((res, rej) => {
		downloadRequest.on("end", res);
		downloadRequest.on("error", rej);
	});
	bar.terminate();
	await video.markDownloaded();
};
