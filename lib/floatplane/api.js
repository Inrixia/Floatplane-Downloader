const settings = require('../settings.js')
const authDB = new (require('../db.js'))('auth', null, settings.encryptLoginDetails?'goAwaehOrIShallTauntYouASecondTiem':null)

const request = require('../request.js')

const findBestEdge = async () => {
	const edgeUrl = 'https://www.floatplane.com/api/edges'
	console.log("> Finding best edge server")
	const body = await request.get({
		url: edgeUrl,
		headers: {
			Cookie: authDB.cookie,
		}
	})
	const edgeInfo = JSON.parse(body);
	let bestEdge = { edgeDistance: null };
	edgeInfo.edges.forEach(edge => {
		if (!edge.allowDownload) return;
		if (!bestEdge.edgeDistance) bestEdge = edge;
		edge.edgeDistance = edge.datacenter.latitude-edgeInfo.client.latitude+edge.datacenter.longitude-edgeInfo.client.longitude;
		if (edge.edgeDistance > bestEdge.edgeDistance) bestEdge = edge;
	})
	settings.floatplaneServer = `https://${bestEdge.hostname}`;
	console.log(`\n\u001b[36mFound! Using Server \u001b[0m[\u001b[38;5;208m${settings.floatplaneServer}\u001b[0m]`);
	return bestEdge.hostname
}

const fetchSubscriptions = async () => {
	const subUrl = 'https://www.floatplane.com/api/user/subscriptions'
	// If this settings.json file is using the old format of storing subscriptions, convert it to the new one
	let body = await request.get({ // Generate the key used to download videos
		headers: {
			Cookie: authDB.cookie,
			'accept': 'application/json'
		},
		url: subUrl
	})
	body = JSON.parse(body)
	if (body.length == 0) { // No subs were found - Most likely a issue with Floatplane
		console.log('\u001b[31m> Floatplane returned no subscriptions! Keeping existing.\u001b[0m')
	} else {
		body.forEach(subscription => {
			// If this subscription does not exist in settings add it with defaults otherwise do nothing
			if (settings.subscriptions[subscription.creator] == undefined) {
				// If the subscription being added is LTT then add it with its special subChannel ignores
				if (subscription.plan.title == 'Linus Tech Tips' || subscription.plan.title == 'LTT Supporter (OG)' || subscription.plan.title == 'LTT Supporter (1080p)') {
					settings.subscriptions[subscription.creator] = {
						id: subscription.creator,
						title: subscription.plan.title,
						enabled: true,
						ignore: {
							"Linus Tech Tips": false,
							"Channel Super Fun": false,
							"Floatplane Exclusive": false,
							"TechLinked": false,
							"Techquickie": false
						}
					}
				} else {
					settings.subscriptions[subscription.creator] = {
						id: subscription.creator,
						title: subscription.plan.title,
						enabled: true,
						ignore: {}
					}
				}
			}
		})
		console.log('> Updated subscriptions!')
	}
}

const fetchVideos = async (subscription, fetchAfter) => {
	const videoUrl = `https://www.floatplane.com/api/creator/videos?creatorGUID=${subscription.id}&fetchAfter=${fetchAfter}`
	const resp = await request.get({ // Generate the key used to download videos
		headers: {
			Cookie: authDB.cookie,
		},
		url: videoUrl,
		resolveWithFullResponse: true
	})
	if (resp.body == '[]') {
		console.log('\n\u001b[31mNo Videos Returned! Please login again...\u001b[0m')
		return []
	} else return JSON.parse(resp.body)
}

module.exports = { findBestEdge, fetchSubscriptions, fetchVideos }