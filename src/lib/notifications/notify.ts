import { Video } from "../Video.js";
import { discordSendEmbed, discordSendMessage } from "./discord.js";
import telegramSendMessage from "./telegram.js";

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
