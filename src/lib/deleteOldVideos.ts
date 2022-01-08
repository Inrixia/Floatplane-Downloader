import fs from 'fs/promises';
import path from 'path';

export const deleteOldVideos = async (rootVideoFolder: string, daysToKeepVideos: number) => {
	let deleted = 0;
	// Recursively check the modified time of every file in the root video folder and all subdirs
	const recursiveDelete = async (dir: string) => {
		const files = await fs.readdir(dir);
		for (const file of files) {
			const filePath = path.join(dir, file);
			const stats = await fs.stat(filePath);
			if (await stats.isDirectory()) await recursiveDelete(filePath);
			else if (stats.mtime.getTime() < Date.now() - daysToKeepVideos * 24 * 60 * 60 * 1000) {
				if (!(filePath.endsWith('.mp4') || filePath.endsWith('.nfo') || filePath.endsWith('.png') || filePath.endsWith('.partial'))) {
					console.log(`\n\n!!WARNING!! - Found file "${filePath}" for deletion in ${rootVideoFolder} that is not a mp4, nfo or png file!`);
					console.log('This could indicate that the root video folder is not being detected properly.');
					console.log('Please report this as a Issue at https://github.com/Inrixia/Floatplane-Downloader/issues/new');
					process.exit(0);
				}
				await fs.unlink(filePath);
				deleted++;
			}
		}
	};
	await recursiveDelete(rootVideoFolder);
	return deleted;
};
