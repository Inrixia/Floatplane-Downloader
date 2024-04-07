import type { Progress } from "got";

export interface IProgressLogger {
	readonly title: string;
	log(message: string): void;
	error(message: string): void;
	onDownloadProgress(progress: Progress, bytesSinceLast: number): void;
	done(message: string): void;
}

export class ProgressLogger {
	public title: string;
	constructor(title: string) {
		this.title = title.trim();
	}
}
