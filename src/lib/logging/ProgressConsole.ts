import { ProgressLogger, type IProgressLogger } from "./ProgressLogger.js";

export class ProgressHeadless extends ProgressLogger implements IProgressLogger {
	readonly title: string;
	constructor(title: string) {
		super();
		this.title = title.trim();
	}

	public log(message: string) {
		console.log(`${this.title} - ${message}`);
	}
	public done(message: string) {
		this.log(`${message} (${ProgressLogger.CompletedVideos}/${ProgressLogger.TotalVideos})`);
	}
	public error(message: string) {
		this.log(`An error occoured: ${message}`);
	}
}
