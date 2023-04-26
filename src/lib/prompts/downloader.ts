import prompts from "prompts";
import type { Video } from "../Video.js";

/**
 * Prompts user to select plex sections to refresh
 * @param selectedSections Sections already selected
 * @param availableSections Array of available plex sections
 */
export const promptVideos = async (videos: Video[]): Promise<Video[]> =>
	(
		await prompts({
			type: "multiselect",
			name: "videos",
			message: "Please select the videos you want to download.",
			choices: videos.map((video) => ({
				title: `[${video.channelTitle}]: ${video.title}`,
				value: video,
				selected: true,
			})),
			hint: "- Space to select. Return to submit",
		})
	).videos || videos;
