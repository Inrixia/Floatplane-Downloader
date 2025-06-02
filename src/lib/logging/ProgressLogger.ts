import type { Progress } from "got";

export interface IProgressLogger {
	readonly title: string;
	log(message: string): void;
	error(err: unknown, context: string): void;
	onDownloadProgress(progress: Progress, bytesSinceLast: number): void;
	done(message: string): void;
}

export class ProgressLogger {
	public title: string;
	constructor(title: string) {
		this.title = title.trim();
	}
	public static sanitizeError(err: unknown): string {
		return err instanceof Error ? err.message : `Something weird happened, whatever was thrown was not a error! ${err}`;
	}
}

export const withContext = (context: string) => (err: unknown) => {
	if (err instanceof Error) throw new Error(`${context} - ${err.message}`);
	throw err;
};

export const nll = () => {};
