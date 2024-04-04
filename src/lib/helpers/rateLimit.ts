// eslint-disable-next-line @typescript-eslint/ban-types
export const rateLimit = (delay: number, func: Function) => {
	let lastCall = 0;
	return (...args: unknown[]) => {
		const _now = Date.now();
		if (_now - lastCall >= delay) func(...args);
		lastCall = _now;
	};
};
