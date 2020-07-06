const got = require('got')
const util = require('util')
const endpoints = require('./endpoints.json')


class FloAPI {
	/**
	 * Returns a class with functions to access the FloatplaneAPI.
	 * @param {object} gotDEFAULTS Default options to use for got instance 
	 */
	constructor(gotDEFAULTS={}) {
		got.extend(gotDEFAULTS)
		this.cookie = []
	}

	set cookies(cookies) {
		this._cookies = cookies
		this.cookie = Object.values(cookies)
	}

	/**
	 * Fetch floatplane edge servers and determine the closest one that allows downloads.
	 * Sets the floatplaneServer in settings to the best edge hostname and returns it.
	 * @returns {string} Hostname of best edge.
	 */
	findBestEdge = async () => {
		const RESPONSE = await got(endpoints.edgeUrl, {
			headers: {
				cookie: this.cookie
			}
		})
		const BODY = JSON.parse(RESPONSE.body)
		let bestEdge = { edgeDistance: null };
		for (const edge of BODY.edges) {
			if (!edge.allowDownload) continue;
			if (!bestEdge.edgeDistance) bestEdge = edge;
			edge.edgeDistance = edge.datacenter.latitude - bestEdge.datacenter.latitude + edge.datacenter.longitude - bestEdge.datacenter.longitude;
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
		const RESPONSE = await got(endpoints.subUrl, { // Generate the key used to download videos
			headers: {
				cookie: this.cookie,
				'accept': 'application/json'
			}
		})
		const BODY = JSON.parse(RESPONSE.body)
		// No subs were found - Most likely a issue with Floatplane
		if (BODY.length == 0) throw new Error(`Floatplane returned no subscriptions! ${util.inspect(BODY, false, 3, true)}`)
		else return BODY
	}

	/**
	 * Fetch videos for a subscription.
	 * @param {number} subscriptionID Subscription id to fetch videos for.
	 * @param {number} fetchAfter Number of videos from the latest to fetch from.
	 * 
	 * @returns {Array<Object>} Array of video objects
	 */
	fetchVideos = async (subscriptionID, fetchAfter) => {
		const RESPONSE = await got(endpoints.videoUrl.replace('%subscriptionID%', subscriptionID).replace('%fetchAfter%', fetchAfter),{ // Generate the key used to download videos
			headers: {
				cookie: this.cookie
			},
			resolveWithFullResponse: true
		})
		if (RESPONSE.body == '[]') throw new Error(`Floatplane returned no videos! ${util.inspect(RESPONSE.body, false, 3, true)}`)
		else return JSON.parse(RESPONSE.body)
	}

	/**
	 * Fetch the key used to download all videos.
	 */
	fetchDownloadKey = async () => { // Get the key used to download videos
		const RESPONSE = await got(endpoints.keyUrl, {
			headers: {
				cookie: this.cookie
			}
		})
		const BODY = JSON.parse(RESPONSE.body)
		if (BODY.message.indexOf('wmsAuthSign') == -1) throw new Error(`Unexpected response: ${util.inspect(BODY, false, 3, true)}`)
		return BODY.replace(/.*wmsAuthSign=*/, '') // Strip everything except for the key from the generated url
	}

	/**
	 * Login to floatplane using provided credentials.
	 * @param {string} username Username/Email
	 * @param {string} password Password
	 * @returns {string} User Object or `{ needs2FA: true }` if 2Factor authentication is required.
	 */
	login = async (user, password) => {
		const RESPONSE = await got.post(endpoints.authUrl, {
			method: 'POST',
			json: {
				username: user,
				password: password
			},
			headers: { 'accept': 'application/json', cookie: this.cookie }
		})
		const BODY = JSON.parse(RESPONSE.body)
		this.cookies = {
			__cfduid: RESPONSE.headers['set-cookie'][0],
			"sails.sid": RESPONSE.headers['set-cookie'][1]
		}
		if (BODY.user) return BODY.user // If the server returns a user then we have logged in
		if (BODY.needs2FA) return { needs2FA: true }
		throw new Error(`Unexpected response: ${util.inspect(BODY, false, 3, true)}`)
	}

	/**
	 * Login using provided 2Factor token.
	 * @param {string} token
	 * @returns {object} User Object
	 */
	twoFactorLogin = async token => {
		const RESPONSE = await got.post(endpoints.factorUrl, {
			method: 'POST',
			json: {
				token: token
			},
			headers: { 'accept': 'application/json', cookie: this.cookie }
		})
		const BODY = JSON.parse(RESPONSE.body)
		if (BODY.user) { // If the server returns a user then we have logged in
			this.cookies = {
				__cfduid: RESPONSE.headers['set-cookie'][0],
				"sails.sid": RESPONSE.headers['set-cookie'][1]
			}
			return BODY.user
		}
		throw new Error(`Unexpected response: ${util.inspect(BODY, false, 3, true)}`)
	}
}

module.exports = FloAPI