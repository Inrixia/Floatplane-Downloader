import { downloadBinaries, detectPlatform, getBinaryFilename } from "ffbinaries";
import fs from "fs";

export const fetchFFMPEG = (): Promise<void> =>
	new Promise((resolve, reject) => {
		const platform = detectPlatform();
		const path = "./db/";
		if (fs.existsSync(`${path}${getBinaryFilename("ffmpeg", platform)}`) === false) {
			process.stdout.write("> Ffmpeg binary missing! Downloading... ");
			downloadBinaries(
				"ffmpeg",
				{
					destination: path,
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
