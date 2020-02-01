const fs = require('fs')
const path = require('path')

class db {
	constructor(name, storePath=null) {
		if (typeof name !== 'string') throw new Error('db name must be string!')
		if (storePath != null) this.storePath = storePath
		else this.storePath = path.join(__dirname, `./db/${name}.json`)
		this.handler = {
			get: (target, key) => {
				if (typeof target[key] == 'object') return new Proxy(target[key], this.handler)
				else return target[key]
			},
			set: (target, key, value) => {
				target[key] = value
				this.writeStore()
			}
		}
		if (fs.existsSync(this.storePath)) this.store = new Proxy(JSON.parse(fs.readFileSync(this.storePath)), this.handler)
		else this.store = new Proxy({}, this.handler)
		return this.store
	}
	writeStore() { fs.writeFileSync(path.join(__dirname, this.storePath), JSON.stringify(this.store, null, 2)) }
}
module.exports = db