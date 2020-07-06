const path = require('path');

/**
 * Returns settings instance.
 */
module.exports = new (require('./db.js'))('settings', path.join(__dirname, `../settings.json`))