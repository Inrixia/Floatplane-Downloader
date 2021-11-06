import type { BlogPost } from 'floatplane/creator';
import { settings } from './lib/helpers';
import db from '@inrixia/db';

export const fHistory = db<{
	'59f94c0bdd241b70349eb72b': BlogPost[];
}>('./db/fHistory.json');

// (async () => {
// 	const subscriptions = await fApi.user.subscriptions();
// 	console.log(subscriptions[0].plan);
// 	const creatorVideos = [];
// 	let i = 0;
// 	for await (const video of fApi.creator.blogPostsIterable(subscriptions[0].creator)) {
// 		console.log(i++);
// 		creatorVideos.push(video);
// 	}
// 	fHistory[subscriptions[0].creator] = creatorVideos;
// })().catch(console.error);

const lttVideos = [...Object.values(fHistory)[0]];

const dates: Record<string, any[]> = {};

const channels = Object.values(settings.subscriptions['59f94c0bdd241b70349eb72b'].channels);

const lastVideoPostedDate = lttVideos[0].releaseDate;

const postTimeDiff = 0;

for (const video of lttVideos) {
	// postTimeDiff += ((+new Date(lastVideoPostedDate))-(+new Date(video.releaseDate)));

	// lastVideoPostedDate = video.releaseDate;
	let videoChannel = 'LTT';

	for (const channel of channels) {
		// Check if the video belongs to this channel
		if (channel.identifiers === false) continue;
		for (const identifier of channel.identifiers) {
			if (typeof identifier.type !== 'string')
				throw new Error(
					`Video value for channel identifier type ${video[identifier.type]} on channel ${channel.title} is of type ${typeof video[identifier.type]} not string!`
				);
			else {
				// Description is named text on videos, kept description for ease of use for users but have to change it here...
				const identifierType = identifier.type === 'description' ? 'text' : identifier.type;
				if ((video[identifierType] as string).toLowerCase().indexOf(identifier.check.toLowerCase()) !== -1) {
					videoChannel = channel.title;
				}
			}
		}
	}
	const releaseDate = new Date(video.releaseDate);
	const YEAR = releaseDate.getFullYear();
	const MONTH = releaseDate.getMonth() + 1; // If the month is less than 10 pad it with a 0
	const DAY = releaseDate.getDate(); // If the month is less than 10 pad it with a 0
	const HOUR = releaseDate.getHours();
	const MINUTE = releaseDate.getMinutes();
	dates[`${videoChannel}-${YEAR}-${MONTH}-${DAY}-${HOUR}-${MINUTE}`] ??= [];
	dates[`${videoChannel}-${YEAR}-${MONTH}-${DAY}-${HOUR}-${MINUTE}`].push([video.title, releaseDate]);
}
console.log(Object.values(dates).filter((date) => date.length > 2));

// console.log(postTimeDiff/lttVideos.length/1000/60/60);
