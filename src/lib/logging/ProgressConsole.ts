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
	public done = this.log;
	public error(message: string) {
		this.log(`An error occoured: ${message}`);
	}
}
