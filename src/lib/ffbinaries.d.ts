declare module "ffbinaries" {
	/**
	 * Gets binaries for the platform
	 * It will get the data from ffbinaries, pick the correct files
	 * and save it to the specified directory
	 */
	function downloadBinaries(
		components: string | Array<string>,
		opts: {
			destination?: string;
			platform?: string;
		},
		callback: (err: Error, result: ffbinariesResult) => void
	): void;

	function detectPlatform(): string;

	function getBinaryFilename(component: string, platform: string): string;

	export type ffbinariesResult = Array<{
		filename: string;
		path: string;
		status: string;
		code: string;
	}>;
}
