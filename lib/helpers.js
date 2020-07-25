/**
 * Recursively runs `func` and handles errors with `errorHandler` until `func` successfully finishes.
 * @param {Function} func 
 * @param {Function} errorHandler 
 */
const loopError = (func, errorHandler=()=>{}) => new Promise(async (resolve, reject) => {
	resolve(await func().catch(async err => {
		if (settings.debug) console.log(err)
		await errorHandler(err);
		resolve(loopError(func, errorHandler))
	}))
})

module.exports = { loopError }