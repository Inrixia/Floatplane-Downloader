import { Video } from "../Video";
import { discordSendEmbed, discordSendMessage } from "./discord";
import telegramSendMessage from "./telegram";

export const notifyDownloaded = (video: Video) => {
	const message = `Downloaded ${video.videoTitle} from ${video.channelTitle}`;
	telegramSendMessage(message);
	discordSendEmbed("New video downloaded", video);
};

export const notifyError = (error: string, video: Video) => {
	const message = `Error downloading ${video.videoTitle} from ${video.channelTitle} : ${error}`;
	telegramSendMessage(message);
	discordSendMessage(message);
};
