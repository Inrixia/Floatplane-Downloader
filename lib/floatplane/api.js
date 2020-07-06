const request = require('request-promise-native')
const endpoints = require('./endpoints.json')

class FloAPI {
	/**
	 * Returns a class with functions to access the FloatplaneAPI.
	 * @param {object} auth 
	 * @param {string} auth.user
	 * @param {string} auth.password
	 * @param {string} auth.token
	 * @param {object} requestDefaults 
	 */
	constructor(auth, requestDefaults={}) {
		if (auth == {} || !auth.ser || !auth.password) throw new Error('Auth must contain a valid cookie to use!')
		this.auth = auth
		this.requestDefaults = requestDefaults

		this.login()
	}

	get cookie() {
		return Object.values(this.cookies)
	}

	/**
	 * Fetch floatplane edge servers and determine the closest one that allows downloads.
	 * Sets the floatplaneServer in settings to the best edge hostname and returns it.
	 * @returns {string} Hostname of best edge.
	 */
	findBestEdge = async () => {
		const EdgeINFO = JSON.parse(await request.get({
			url: endpoints.edgeUrl,
			headers: {
				Cookie: this.cookie,
			}
		}))
		let bestEdge = { edgeDistance: null };
		for (edge of EdgeINFO) {
			if (!edge.allowDownload) return;
			if (!bestEdge.edgeDistance) bestEdge = edge;
			edge.edgeDistance = edge.datacenter.latitude - edgeInfo.client.latitude + edge.datacenter.longitude - edgeInfo.client.longitude;
			if (edge.edgeDistance > bestEdge.edgeDistance) bestEdge = edge;
		}
		return bestEdge.hostname
	}

	/**
	 * Fetch subscriptions for the logged in user.
	 * @returns {Array<Object>} Array of subscription objects.
	 */
	fetchSubscriptions = async () => {
		if (!auth.cookie) throw new Error('User must be logged in to fetch subscriptions. Cookies are empty!')
		let body = JSON.parse(await request.get({ // Generate the key used to download videos
			headers: {
				cookie: this.cookie,
				'accept': 'application/json'
			},
			url: endpoints.subUrl
		}))
		// No subs were found - Most likely a issue with Floatplane
		if (body.length == 0) throw new Error('Floatplane returned no subscriptions!')
		else return body
	}

	/**
	 * Fetch videos for a subscription.
	 * @param {number} subscriptionID Subscription id to fetch videos for.
	 * @param {number} fetchAfter Number of videos from the latest to fetch from.
	 * 
	 * @returns {Array<Object>} Array of video objects
	 */
	fetchVideos = async (subscriptionID, fetchAfter) => {
		const RESPONSE = await request.get({ // Generate the key used to download videos
			headers: {
				cookie: this.cookie,
			},
			url: endpoints.videoUrl.replace('%subscriptionID%', subscriptionID).replace('%fetchAfter%', fetchAfter),
			resolveWithFullResponse: true
		})
		if (RESPONSE.body == '[]') throw new Error('Floatplane returned no videos!')
		else return JSON.parse(RESPONSE.body)
	}

	/**
	 * Fetch the key used to download all videos.
	 */
	fetchDownloadKey = async () => { // Get the key used to download videos
		const BODY = JSON.parse(await floatRequest.get({
			url: endpoints.keyUrl,
			headers: {
				cookie: this.cookie,
			}
		}))
		if (BODY.message.indexOf('wmsAuthSign') == -1) throw new Error(`Unexpected response: ${BODY.message}`)
		return BODY.replace(/.*wmsAuthSign=*/, '') // Strip everything except for the key from the generated url
	}

	/**
	 * Login to floatplane using saved credentials.
	 */
	login = async () => {
		const BODY = await floatRequest.post({
			method: 'POST',
			json: {
				username: auth.user,
				password: auth.password
			},
			url: endpoints.authUrl,
			headers: { 'accept': 'application/json' }
		})
		if (BODY.needs2FA) return await this.twoFactorLogin() // If the server returns needs2FA then we need to prompt and enter a 2Factor code
		else if (BODY.user) { // If the server returns a user then we have logged in
			this.cookies = {
				__cfduid: resp.headers['set-cookie'][0],
				"sails.sid": resp.headers['set-cookie'][1]
			}
			return resp.body
		}
		throw new Error(`Unexpected response: ${resp.body}`)
	}

	/**
	 * Login using 2 factor code
	 */
	twoFactorLogin = async () => {
		const RESPONSE = await floatRequest.post({
			method: 'POST',
			json: {
				token: this.auth.token
			},
			url: endpoints.factorUrl,
			headers: {
				'accept': 'application/json'
			},
			resolveWithFullResponse: true
		})
		if (RESPONSE.body.user) { // If the server returns a user then we have logged in
			this.cookies = {
				__cfduid: RESPONSE.headers['set-cookie'][0],
				"sails.sid": RESPONSE.headers['set-cookie'][1]
			}
			return RESPONSE.body
		}
		throw new Error(`Unexpected response: ${RESPONSE.body}`)
	}
}

module.exports = FloAPI