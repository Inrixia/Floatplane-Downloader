import { detectPlatform, downloadBinaries, getBinaryFilename } from "ffbinaries";
import fs from "fs";
import { dirname } from "path";
import { args } from "./index";

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
				}
			);
		} else resolve();
	});
