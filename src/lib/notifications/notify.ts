import { settings } from "../helpers/index.js";
import { Video } from "../Video.js";
import discordSendMessage from "./discord.js";
import telegramSendMessage from "./telegram.js";

const notifyAll = (message: string) => {
	if (settings.notifications.telegram && settings.notifications.telegram.enabled) {
		telegramSendMessage(message);
	}
	if (settings.notifications.discord && settings.notifications.discord.enabled) {
		discordSendMessage(message);
	}
};

export const notifyDownloaded = (video: Video) => {
	const message = `Downloaded ${video.videoTitle} from ${video.channelTitle}`;
	notifyAll(message);
};

export const notifyError = (video: Video) => {
	const message = `Error downloading ${video.videoTitle} from ${video.channelTitle}`;
	notifyAll(message);
};
