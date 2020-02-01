const path = require('path');
module.exports = new (require('./db.js'))('settings', path.join(__dirname, `../settings.json`))