import { settings } from "../helpers/index.js";
import { Video } from "../Video.js";
import telegramNotify from "./telegram.js";

export const notifyDownloaded = (video: Video) => {
	const { videoTitle, channelTitle } = video;
	const message = `Downloaded ${videoTitle} from ${channelTitle}`;
	if (settings.notifications.telegram && settings.notifications.telegram.enabled) {
		telegramNotify(message);
	}
};

export const notifyError = (video: Video) => {
	const { videoTitle, channelTitle } = video;
	const message = `Error downloading ${videoTitle} from ${channelTitle}`;
	if (settings.notifications.telegram && settings.notifications.telegram.enabled) {
		telegramNotify(message);
	}
};
