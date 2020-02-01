const settings = require('./settings.js')
const prompt = require('prompt');
const floatRequest = require('./request.js')

const beginAuthentication = async requestCredentials => { // Check if the user is authenticated
	// Check if a proper method of authentication exists if not get the users login details
	if (requestCredentials || !settings.cookies.__cfduid && (!settings.user || !settings.password)) {
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
				settings.user = result['Email/Username']
				settings.password = result.Password
				console.log('');
				await login() // After getting the users details get their session and log them in. Then finish.
				resolve()
			})
		);
	// If they have no session but do have login details then just get their session log them in and finish.
	} else if((!settings.cookies.__cfduid && (settings.user || settings.password))) await login()
	else console.log('> Using saved login data'); // They are already logged in with suficcent auth, just continue.
}
const login = async () => {
	const authUrl = 'https://www.floatplane.com/api/auth/login'
	console.log(`> Logging in as ${settings.user}`)
	const body = await floatRequest.post({
		method: 'POST',
		json: {
			username: settings.user,
			password: settings.password
		},
		url: authUrl,
		headers: { 'accept': 'application/json' }
	})
	if (body.needs2FA) await twoFactorLogin() // If the server returns needs2FA then we need to prompt and enter a 2Factor code
	else if (body.user) { // If the server returns a user then we have logged in
		console.log(`\u001b[32mLogged In as ${settings.user}!\u001b[0m\n`);
		settings.cookies.__cfduid = resp.headers['set-cookie'][0]
		settings.cookies['sails.sid'] = resp.headers['set-cookie'][1]
	} else if (body.message != undefined) {
		console.log(`\u001b[41mERROR> ${body.message}\u001b[0m`);
		await beginAuthentication(true)
	} else {
		console.log('\u001b[41mThere was a error while logging in...\u001b[0m\n');
		await beginAuthentication(true) // Try to regain auth incase they entered the wrong details or their session is invalid
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
				console.log(`\u001b[32mLogged In as ${settings.user}!\u001b[0m\n`);
				settings.cookies.__cfduid = resp.headers['set-cookie'][0]
				settings.cookies['sails.sid'] = resp.headers['set-cookie'][1]
				resolve()
			} else if (resp.body.message != undefined) {
				console.log("\u001b[41mERROR> "+resp.body.message+"\u001b[0m");
				await twoFactorLogin()
				resolve();
			} else {
				console.log('\u001b[41mThere was a error while logging in...\u001b[0m\n');
				await beginAuthentication(true) // Try to regain auth incase they entered the wrong details or their session is invalid
				resolve()
			}
		})
	);
}

module.exports = { checkAuth: beginAuthentication, login, twoFactorLogin }