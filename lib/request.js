const settings = require('./settings.js')

const request = require('request-promise-native');

module.exports = request.defaults({ // Sets the global requestMethod to be used, this maintains headers
	headers: {
		'User-Agent': `FloatplanePlex/${settings.version} (Inrix, +https://linustechtips.com/main/topic/859522-floatplane-download-plex-script-with-code-guide/)`
	},
	jar: true, // Use the same cookies globally
	rejectUnauthorized: false,
	followAllRedirects: true
})