import { settings } from "../helpers/index";
import { Video } from "../Video";

export const discordSendEmbed = async (title: string, video: Video) => {
	const discord = settings.notifications.discord;
	if (!discord || !discord.enabled || !discord.webhookUrl || !video) return;

	try {
		fetch(discord.webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				embeds: [
					{
						title: title,
						author: {
							name: video.channelTitle,
						},
						image: {
							url: video.artworkUrl,
						},
						fields: [
							{
								name: "Title",
								value: video.videoTitle,
								inline: true,
							},
							{
								name: "Channel",
								value: video.channelTitle,
								inline: true,
							},
						],
					},
				],
			}),
		});
	} catch {
		console.error("Failed to send discord notification");
	}
};

export const discordSendMessage = async (message: string) => {
	const discord = settings.notifications.discord;
	if (!discord || !discord.enabled || !discord.webhookUrl || !message) return;

	try {
		fetch(discord.webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				content: message,
			}),
		});
	} catch {
		console.error("Failed to send discord notification");
	}
};
