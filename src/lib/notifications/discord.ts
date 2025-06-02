import { settings } from "../helpers/index";
import { Video } from "../Video";

export const discordEmbed = async (title: string, video: Video) => {
	const discord = settings.notifications.discord;
	if (!discord || !discord.enabled || !discord.webhookUrl || !video) return;

	try {
		await fetch(discord.webhookUrl, {
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
	} catch (err) {
		console.error("Failed to send discord notification", err);
	}
};

export const discordMessage = async (message: string) => {
	const discord = settings.notifications.discord;
	if (!discord || !discord.enabled || !discord.webhookUrl || !message) return;

	try {
		await fetch(discord.webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				content: message,
			}),
		});
	} catch (err) {
		console.error("Failed to send discord notification", err);
	}
};
