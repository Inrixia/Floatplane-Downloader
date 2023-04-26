import { MultiProgressBars, UpdateOptions } from "multi-progress-bars";
import { VideoState, Video } from "./lib/Video.js";

import { settings, args } from "./lib/helpers.js";
import { MyPlexAccount } from "@ctrl/plex";

import { promisify } from "util";
const sleep = promisify(setTimeout);

const reset = "\u001b[0m";
const cy = (str: string | number) => `\u001b[36;1m${str}\u001b[0m`;
const gr = (str: string | number) => `\u001b[32;1m${str}\u001b[0m`;
const ye = (str: string | number) => `\u001b[33;1m${str}\u001b[0m`;
const bl = (str: string | number) => `\u001b[34;1m${str}\u001b[0m`;

type DownloadProgress = { total: number; transferred: number; percent: number };

const MaxRetries = 5;
const DownloadThreads = 8;

let mpb: MultiProgressBars;
if (args.headless !== true) mpb = new MultiProgressBars({ initMessage: "", anchor: "bottom" });

let totalVideos = 0;
let completedVideos = 0;
const summaryStats: { [key: string]: { totalMB: number; downloadedMB: number; downloadSpeed: number } } = {
	_: { totalMB: 0, downloadedMB: 0, downloadSpeed: 0 },
};

// The number of available slots for making delivery requests,
// limiting the rate of requests to avoid exceeding the API rate limit.
let AvalibleDeliverySlots = DownloadThreads;
const DownloadQueue: (() => void)[] = [];

const getDownloadSempahore = async () => {
	totalVideos++;
	// If there is an available request slot, proceed immediately
	if (AvalibleDeliverySlots > 0) return AvalibleDeliverySlots--;

	// Otherwise, wait for a request slot to become available
	return new Promise((r) => DownloadQueue.push(() => r(AvalibleDeliverySlots--)));
};

const releaseDownloadSemaphore = () => {
	AvalibleDeliverySlots++;
	completedVideos++;

	// If there are queued requests, resolve the first one in the queue
	DownloadQueue.shift()?.();
};

const updateSummaryBar = () => {
	if (summaryStats === undefined || args.headless === true) return;
	const { totalMB, downloadedMB, downloadSpeed } = Object.values(summaryStats).reduce(
		(summary, stats) => {
			for (const key in stats) {
				summary[key as keyof typeof stats] += stats[key as keyof typeof stats];
			}
			return summary;
		},
		{ totalMB: 0, downloadedMB: 0, downloadSpeed: 0 }
	);
	// (videos remaining * avg time to download a video)
	const processed = `Processed:        ${ye(completedVideos)}/${ye(totalVideos)}`;
	const downloaded = `Total Downloaded: ${cy(downloadedMB.toFixed(2))}/${cy(totalMB.toFixed(2) + "MB")}`;
	const speed = `Download Speed:   ${gr(((downloadSpeed / 1024000) * 8).toFixed(2) + "mb/s")}`;
	mpb?.setFooter({
		message: `${processed}    ${downloaded}    ${speed}`,
		pattern: "",
	});
};

const log = (formattedTitle: string, barUpdate: UpdateOptions, displayNow = true) => {
	if (args.headless === true && displayNow === true && barUpdate.message !== undefined) console.log(`${formattedTitle} - ${barUpdate.message}`);
	mpb?.updateTask(formattedTitle, barUpdate);
};

const formatTitle = (title: string) => {
	if (args.headless === true) return title.trim();

	let formattedTitle = title.trim().slice(0, 32).trim();
	let i = 1;
	if (mpb !== undefined) while (mpb.getIndex(formattedTitle) !== undefined) formattedTitle = `${title.trim().slice(0, 32).trim()} [${++i}]`;

	return formattedTitle;
};

export const queueVideo = async (video: Video) => {
	await getDownloadSempahore();

	processVideo(video).then(releaseDownloadSemaphore);
};

const processVideo = async (video: Video, retries = 0) => {
	const fTitle = formatTitle(video.title);
	try {
		mpb?.addTask(fTitle, {
			type: "percentage",
			message: "Checking download status...",
		});

		if (settings.extras.saveNfo) await video.saveNfo();
		if (settings.extras.downloadArtwork) await video.downloadArtwork();

		switch (await video.getState()) {
			case VideoState.Missing: {
				mpb?.addTask(fTitle, {
					type: "percentage",
					message: "Waiting on delivery cdn...",
				});

				const startTime = Date.now();

				if (args.headless === true) console.log(`${fTitle} - Waiting on delivery cdn...`);

				const downloadRequest = await video.download(settings.floatplane.videoResolution);

				downloadRequest.on("downloadProgress", (downloadProgress: DownloadProgress) => {
					const timeElapsed = (Date.now() - startTime) / 1000;

					const totalMB = downloadProgress.total / 1024000;
					const downloadedMB = downloadProgress.transferred / 1024000;
					const downloadSpeed = downloadProgress.transferred / timeElapsed;
					const downloadETA = downloadProgress.total / downloadSpeed - timeElapsed; // Round to 4 decimals

					log(
						fTitle,
						{
							percentage: downloadProgress.percent,
							message: `${reset}${cy(downloadedMB.toFixed(2))}/${cy(totalMB.toFixed(2) + "MB")} ${gr(((downloadSpeed / 1024000) * 8).toFixed(2) + "mb/s")} ETA: ${bl(
								Math.floor(downloadETA / 60) + "m " + (Math.floor(downloadETA) % 60) + "s"
							)}`,
						},
						false
					);
					summaryStats[fTitle] = { totalMB, downloadedMB, downloadSpeed };
					updateSummaryBar();
				});

				await new Promise((res, rej) => {
					downloadRequest.on("end", res);
					downloadRequest.on("error", rej);
				});

				summaryStats._.downloadedMB = summaryStats[fTitle].downloadedMB;
				summaryStats._.totalMB = summaryStats[fTitle].totalMB;
				delete summaryStats[fTitle];
			}
			// eslint-disable-next-line no-fallthrough
			case VideoState.Partial: {
				log(fTitle, {
					percentage: 0.99,
					message: "Muxing ffmpeg metadata...",
				});
				await video.muxffmpegMetadata();

				if (settings.postProcessingCommand !== "") {
					log(fTitle, { message: `Running post download command "${settings.postProcessingCommand}"...` }, true);
					await video.postProcessingCommand().catch((err) => console.log(`An error occurred while executing the postProcessingCommand!\n${err.message}\n`));
				}

				if (settings.plex.enabled) {
					const plexApi = await new MyPlexAccount(undefined, undefined, undefined, settings.plex.token).connect();
					for (const sectionToUpdate of settings.plex.sectionsToUpdate) {
						await (await (await (await (await plexApi.resource(sectionToUpdate.server)).connect()).library()).section(sectionToUpdate.section)).refresh();
					}
				}
			}
			// eslint-disable-next-line no-fallthrough
			case VideoState.Muxed: {
				mpb?.done(fTitle);
				setTimeout(() => mpb?.removeTask(fTitle), 10000 + Math.floor(Math.random() * 6000));
				updateSummaryBar();
			}
		}
	} catch (error) {
		let info;
		if (!(error instanceof Error)) info = new Error(`Something weird happened, whatever was thrown was not a error! ${error}`);
		else info = error;
		// Handle errors when downloading nicely
		if (retries < MaxRetries) {
			log(fTitle, { message: `\u001b[31m\u001b[1mERR\u001b[0m: ${info.message} - Retrying in ${retries}s [${retries}/${MaxRetries}]` });

			// Wait between retries
			await sleep(1000 * (retries + 1));

			await processVideo(video, ++retries);
		} else log(fTitle, { message: `\u001b[31m\u001b[1mERR\u001b[0m: ${info.message} Max Retries! [${retries}/${MaxRetries}]` });
	}
};
