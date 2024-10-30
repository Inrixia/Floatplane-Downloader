import { ProgressLogger, type IProgressLogger } from "./ProgressLogger.js";

export class ProgressHeadless extends ProgressLogger implements IProgressLogger {
	public log(message: string) {
		console.log(`${this.title} - ${message}`);
	}
	public error(err: any) {
		this.log(`An error occoured: ${this.sanitizeError(err)}`);
	}
	public done = this.log;
	public onDownloadProgress() {}
	public start() {}
}
