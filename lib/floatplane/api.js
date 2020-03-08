const settings = require('../settings.js')
const db = require('../db.js')
const authDB = new db('auth', null, settings.encryptLoginDetails?'goAwaehOrIShallTauntYouASecondTiem':null)
const apiDB = new db('apiReferences')

const request = require('../request.js')

/**
 * Fetch floatplane edge servers and determine the closest one that allows downloads.
 * Sets the floatplaneServer in settings to the best edge hostname and returns it.
 * @returns {string} Hostname of best edge.
 */
const findBestEdge = async () => {
	console.log("> Finding best edge server")
	const body = await request.get({
		url: apiDB.fp.edgeUrl,
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

/**
 * Fetch subscriptions for the logged in user.
 * @returns {Array<Object>} Array of subscription objects.
 */
const fetchSubscriptions = async () => {
	if (!authDB.cookie) throw new Error('User must be logged in to fetch subscriptions. Cookies are empty!')
	// If this settings.json file is using the old format of storing subscriptions, convert it to the new one
	let body = await request.get({ // Generate the key used to download videos
		headers: {
			Cookie: authDB.cookie,
			'accept': 'application/json'
		},
		url: apiDB.fp.subUrl
	})
	body = JSON.parse(body)
	if (body.length == 0) { // No subs were found - Most likely a issue with Floatplane
		console.log('\u001b[31m> Floatplane returned no subscriptions! Keeping existing.\u001b[0m')
	} else {
		console.log('> Updated subscriptions!')
		return body.map(subscription => {
			// Set the sub title to Linus Tech Tips for all LTT subs
			if (
				subscription.plan.title == 'Linus Tech Tips' || 
				subscription.plan.title == 'LTT Supporter (OG)' || 
				subscription.plan.title == 'LTT Supporter (1080p)' || 
				subscription.plan.title == 'LTT Supporter Plus'
			) subscription.plan.title = 'Linus Tech Tips'
			return subscription
		})
	}
}

/**
 * Fetch videos for a subscription.
 * @param {number} subscriptionID Subscription id to fetch videos for.
 * @param {number} fetchAfter Number of videos from the latest to fetch from.
 * 
 * @returns {Array<Object>} Array of video objects
 */
const fetchVideos = async (subscriptionID, fetchAfter) => {
	const resp = await request.get({ // Generate the key used to download videos
		headers: {
			Cookie: authDB.cookie,
		},
		url: apiDB.fp.videoUrl.replace('%subscriptionID%', subscriptionID).replace('%fetchAfter%', fetchAfter),
		resolveWithFullResponse: true
	})
	if (resp.body == '[]') {
		console.log('\n\u001b[31mNo Videos Returned! Please login again...\u001b[0m')
		return []
	} else return JSON.parse(resp.body)
}

module.exports = { findBestEdge, fetchSubscriptions, fetchVideos }