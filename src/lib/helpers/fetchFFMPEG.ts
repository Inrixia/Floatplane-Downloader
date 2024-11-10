import { downloadBinaries, detectPlatform, getBinaryFilename } from "ffbinaries";
import { args } from "./index.js";
import fs from "fs";
import { dirname } from "path";

export const ffmpegPath = args.ffmpegPath || `${args.dbPath}/${getBinaryFilename("ffmpeg", detectPlatform())}`;

export const fetchFFMPEG = (): Promise<void> =>
	new Promise((resolve, reject) => {
		const platform = detectPlatform();
		if (!fs.existsSync(ffmpegPath)) {
			process.stdout.write("> Ffmpeg binary missing! Downloading... ");
			downloadBinaries(
				"ffmpeg",
				{
					destination: dirname(ffmpegPath),
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
