import { ProgressLogger, type IProgressLogger } from "./ProgressLogger";

export class ProgressHeadless extends ProgressLogger implements IProgressLogger {
	public log(message: string) {
		console.log(`${this.title} - ${message}`);
	}
	public error(err: unknown) {
		this.log(`An error occoured: ${ProgressLogger.sanitizeError(err)}`);
	}
	public done = this.log;
	public onDownloadProgress() {}
	public start() {}
}
