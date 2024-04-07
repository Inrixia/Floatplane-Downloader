import { ProgressLogger, type IProgressLogger } from "./ProgressLogger.js";

export class ProgressHeadless extends ProgressLogger implements IProgressLogger {
	public log(message: string) {
		console.log(`${this.title} - ${message}`);
	}
	public error(message: string) {
		this.log(`An error occoured: ${message}`);
	}
	public done = this.log;
	public onDownloadProgress() {}
}
