import { settings } from "../helpers/index.js";

export default async function telegramSendMessage(message: string) {
	const telegram = settings.notifications.telegram;
	if (!telegram || !telegram.enabled || !telegram.token || !telegram.chatId || !message) return;

	try {
		fetch(`https://api.telegram.org/bot${telegram.token}/sendMessage`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				chat_id: telegram.chatId,
				text: message,
			}),
		});
	} catch {
		console.error("Failed to send telegram notification");
	}
}
