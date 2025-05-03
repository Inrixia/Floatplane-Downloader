import { settings } from "../helpers/index.js";

export default async function discordSendMessage(message: string) {
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
}
