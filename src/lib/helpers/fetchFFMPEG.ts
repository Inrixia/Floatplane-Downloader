import { downloadBinaries, detectPlatform, getBinaryFilename } from "ffbinaries";
import { args } from "./index.js";
import fs from "fs";
import { dirname, basename } from "path";

export const fetchFFMPEG = (): Promise<void> =>
	new Promise((resolve, reject) => {
		let platform = detectPlatform();
		let path = args.ffmpegPath;
		if (fs.existsSync(path) === false) {
			process.stdout.write("> Ffmpeg binary missing! Downloading... ");
			downloadBinaries(
				basename(path),
				{
					destination: dirname(path),
					platform,
				},
				(err) => {
					if (err !== null) reject(err);
					else {
						process.stdout.write("\u001b[36mDone!\u001b[0m\n\n");
						resolve();
					}
				},
			);
		} else resolve();
	});
