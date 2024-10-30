import type { Progress } from "got";

export interface IProgressLogger {
	readonly title: string;
	log(message: string): void;
	error(err: any, context: string): void;
	onDownloadProgress(progress: Progress, bytesSinceLast: number): void;
	done(message: string): void;
}

export class ProgressLogger {
	public title: string;
	constructor(title: string) {
		this.title = title.trim();
	}
	protected sanitizeError(err: any): string {
		return err instanceof Error ? err.message : `Something weird happened, whatever was thrown was not a error! ${err}`;
	}
}

export const withContext = (context: string) => (err: any) => {
	if (err instanceof Error) throw new Error(`${context} - ${err.message}`);
	throw err;
};
