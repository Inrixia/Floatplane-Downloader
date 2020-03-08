const settings = require('../settings.js')
const db = require('../db.js')
const authDB = new db('auth', null, settings.encryptLoginDetails?'goAwaehOrIShallTauntYouASecondTiem':null)
const apiDB = new db('apiReferences')

const prompt = require('prompt');
const floatRequest = require('../request.js')

/**
 * Prompts user for credentials if none are saved. Then attempt to authenticate with floatplanes servers.
 * @param {Boolean} rePromptForCredentials If true prompt even if credentials already exist.
 */
const promptForCredentials = async rePromptForCredentials => { // Check if the user is authenticated
	// Check if a proper method of authentication exists if not get the users login details
	if (rePromptForCredentials || !(authDB.cookies||{}).__cfduid && (!authDB.user || !authDB.password)) {
		console.log('> Please enter your login details:');
		prompt.start();
		await new Promise(async (resolve, reject) => prompt.get(
			[{
				name: "Email/Username", 
				required: true
			}, {
				name: "Password", 
				required: true, 
				hidden: true, 
				replace: '*'
			}], async (err, result) => {
				if (err) reject(err)
				if (!result) process.exit(1)
				authDB.user = result['Email/Username']
				authDB.password = result.Password
				// After getting the users details get their session and log them in. Then finish.
				await login()
				resolve()
			})
		);
	// If they have no session but do have login details then just get their session log them in and finish.
	} else if((!(authDB.cookies||{}).__cfduid && (authDB.user || authDB.password))) await login()
	else console.log('> Using saved login data'); // They are already logged in with suficcent auth, just continue.
}

/**
 * Converts cookies from object to array form for use in requests. 
 */
const buildCookies = () => {
	// Build cookies for requests
	const cookie = []
	for (k in authDB.cookies) cookie.push(authDB.cookies[k])
	authDB.cookie = cookie
	console.log('> Cookie Constructed!');
}

/**
 * Login to floatplane using saved credentials.
 */
const login = async () => {
	console.log(`> Logging in as ${authDB.user}`)
	const body = await floatRequest.post({
		method: 'POST',
		json: {
			username: authDB.user,
			password: authDB.password
		},
		url: apiDB.fp.authUrl,
		headers: { 'accept': 'application/json' }
	}).catch(err => console.log(`\u001b[41mError logging in.\u001b[0m ${err}\n`))
	if (!body) {
		await promptForCredentials(true)
		return // Try to regain auth incase they entered the wrong details or their session is invalid
	}
	if (body.needs2FA) await twoFactorLogin() // If the server returns needs2FA then we need to prompt and enter a 2Factor code
	else if (body.user) { // If the server returns a user then we have logged in
		console.log(`\u001b[32mLogged In as ${authDB.user}!\u001b[0m\n`);
		authDB.cookies = {
			__cfduid: resp.headers['set-cookie'][0],
			"sails.sid": resp.headers['set-cookie'][1]
		}
	} else if (body.message != undefined) {
		console.log(`\u001b[41mERROR> ${body.message}\u001b[0m`);
		await promptForCredentials(true)
	}
}

/**
 * Prompt user for their 2factor code and then finish login using it.
 */
const twoFactorLogin = async () => {
	console.log('> Please enter your 2 Factor authentication code:');
	prompt.start();
	await new Promise(async (resolve, reject) => prompt.get(
		[{
			name: "2 Factor Code", 
			required: true
		}], async (err, result) => {
			if (err) reject(err);
			if (!result) process.exit(1)
			const resp = await floatRequest.post({
				method: 'POST',
				json: {
					token: result['2 Factor Code']
				},
				url: apiDB.fp.factorUrl,
				headers: {
					'accept': 'application/json'
				},
				resolveWithFullResponse: true
			}).catch(err => console.log(`\u001b[41mError with 2 factor authentication code.\u001b[0m ${err}\n`))
			if (!resp) {
				await promptForCredentials(true) // Try to regain auth incase they entered the wrong details or their session is invalid
				resolve()
			} else if (resp.body.user) { // If the server returns a user then we have logged in
				console.log(`\u001b[32mLogged In as ${authDB.user}!\u001b[0m\n`);
				authDB.cookies = {
					__cfduid: resp.headers['set-cookie'][0],
					"sails.sid": resp.headers['set-cookie'][1]
				}
				resolve()
			} else if (resp.body.message != undefined) {
				console.log("\u001b[41mERROR> "+resp.body.message+"\u001b[0m");
				await twoFactorLogin()
				resolve();
			}
		})
	);
}

/**
 * Fetch the key used to download all videos.
 */
const fetchDownloadKey = async () => { // Get the key used to download videos
	console.log("> Fetching download key")
	const body = await floatRequest.get({
		url: apiDB.fp.keyUrl,
		headers: {
			Cookie: authDB.cookie,
		}
	})
	if (JSON.parse(body).message == "You must be logged-in to access this resource.") { // Check if key is invalid
		console.log('\u001b[31mInvalid Key! Attempting to re-authenticate...\u001b[0m');
		authDB.cookies.__cfduid = ''
		// If its invalid check authentication again, reconstruct the cookies and then try parsekey again if that goes through then resolve
		await promptForCredentials()
	} else {
		/*if (settings.autoFetchServer) {
			// Fetches the API url used to download videos
			settings.floatplaneServer = body.replace('floatplaneclub', 'floatplane').slice(1, body.lastIndexOf('floatplane')+14);
		}*/
		authDB.key = body.replace(/.*wmsAuthSign=*/, '') // Strip everything except for the key from the generated url
		console.log('\u001b[36mFetched download key!\u001b[0m');
		return authDB.key
	}
}

/**
 * Prompt for credentials if none exist, login, build request cookies and fetch the video download key.
 */
const init = async () => {
	await promptForCredentials()
	buildCookies()
	await fetchDownloadKey()
}

module.exports = { init }