const settings = require('../settings.js')
const authDB = new (require('../db.js'))('auth', null, settings.encryptLoginDetails?'goAwaehOrIShallTauntYouASecondTiem':null)

const prompt = require('prompt');
const floatRequest = require('../request.js')


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
				await login() // After getting the users details get their session and log them in. Then finish.
				resolve()
			})
		);
	// If they have no session but do have login details then just get their session log them in and finish.
	} else if((!(authDB.cookies||{}).__cfduid && (authDB.user || authDB.password))) await login()
	else console.log('> Using saved login data'); // They are already logged in with suficcent auth, just continue.
}

const buildCookies = () => {
	// Build cookies for requests
	const cookie = []
	for (k in authDB.cookies) cookie.push(authDB.cookies[k])
	authDB.cookie = cookie
	console.log('> Cookie Constructed!');
}

const login = async () => {
	const authUrl = 'https://www.floatplane.com/api/auth/login'
	console.log(`> Logging in as ${authDB.user}`)
	const body = await floatRequest.post({
		method: 'POST',
		json: {
			username: authDB.user,
			password: authDB.password
		},
		url: authUrl,
		headers: { 'accept': 'application/json' }
	})
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
	} else {
		console.log('\u001b[41mThere was a error while logging in...\u001b[0m\n');
		await promptForCredentials(true) // Try to regain auth incase they entered the wrong details or their session is invalid
	}
}
const twoFactorLogin = async () => {
	const factorUrl = 'https://www.floatplane.com/api/auth/checkFor2faLogin'
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
				url: factorUrl,
				headers: {
					'accept': 'application/json'
				},
				resolveWithFullResponse: true
			})
			if (resp.body.user) { // If the server returns a user then we have logged in
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
			} else {
				console.log('\u001b[41mThere was a error while logging in...\u001b[0m\n');
				await promptForCredentials(true) // Try to regain auth incase they entered the wrong details or their session is invalid
				resolve()
			}
		})
	);
}

const fetchDownloadKey = async () => { // Get the key used to download videos
	const keyUrl = 'https://www.floatplane.com/api/video/url?guid=MSjW9s3PiG&quality=1080'
	console.log("> Fetching download key")
	const body = await floatRequest.get({
		url: keyUrl,
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

const init = async () => {
	await promptForCredentials()
	buildCookies()
	await fetchDownloadKey()
}

module.exports = { init }