const fs = require('fs')
const path = require('path')

const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '../settings.json')))
const writeSettings = () => fs.writeFileSync(path.join(__dirname, '../settings.json'), JSON.stringify(settings, null, 2))

const handler = {
	get: (target, key) => {
		if (typeof target[key] == 'object') return new Proxy(target[key], handler)
		else return target[key]
	},
	set: (target, key, value) => {
		target[key] = value
		writeSettings()
	}
}
module.exports = new Proxy(settings, handler)