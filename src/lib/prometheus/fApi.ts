import { Histogram } from "prom-client";
import { fApi } from "../helpers.js";

const httpRequestDurationmS = new Histogram({
	name: "request_duration_ms",
	help: "Duration of HTTP requests in ms",
	labelNames: ["method", "hostname", "pathname", "status"],
	buckets: [1, 10, 50, 100, 250, 500],
});
type WithStartTime<T> = T & { _startTime: number };
fApi.extend({
	hooks: {
		beforeRequest: [
			(options) => {
				(<WithStartTime<typeof options>>options)._startTime = Date.now();
			},
		],
		afterResponse: [
			(res) => {
				const url = res.requestUrl;
				const options = <WithStartTime<typeof res.request.options>>res.request.options;
				const thumbsIndex = url.pathname.indexOf("thumbnails");
				const pathname = thumbsIndex !== -1 ? url.pathname.substring(0, thumbsIndex + thumbsIndex + 10) : url.pathname;
				httpRequestDurationmS.observe({ method: options.method, hostname: url.hostname, pathname, status: res.statusCode }, Date.now() - options._startTime);
				return res;
			},
		],
	},
});
