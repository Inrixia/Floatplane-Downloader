import { collectDefaultMetrics, register, Gauge, Histogram } from "prom-client";
import { Socket } from "net";
import { createServer } from "http";
import { settings, DownloaderVersion, fApi } from "./lib/helpers.js";

collectDefaultMetrics();

const httpRequestDurationmS = new Histogram({
	name: "fpd_request_duration_ms",
	help: "Duration of HTTP requests in ms",
	labelNames: ["method", "hostname", "pathname", "status"],
	buckets: [0, 1, 5, 10, 25, 50, 100, 250, 500],
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
				httpRequestDurationmS.observe(
					{ method: options.method, hostname: url.hostname, pathname: url.pathname, status: res.statusCode },
					Date.now() - options._startTime,
				);
				return res;
			},
		],
	},
});

new Gauge({
	name: "fpd_instance",
	help: "Floatplane Downloader instances",
	labelNames: ["version"],
})
	.labels({ version: DownloaderVersion })
	.set(1);

export const initProm = (instance: string) => {
	if (settings.metrics.contributeMetrics) {
		const connect = () => {
			const socket = new Socket();
			socket.on("data", async () => socket.write(await register.metrics()));
			socket.on("close", () => {
				socket.destroy(); // Ensure the old socket is released
				setTimeout(connect, 1000);
			});
			socket.on("error", () => null);
			socket.connect(5000, "na.spookelton.net", () => socket.write(instance));
		};
		connect();
	}

	if (settings.metrics.prometheusExporterPort !== null) {
		const httpServer = createServer(async (req, res) => {
			if (req.url === "/metrics") {
				try {
					res.setHeader("Content-Type", register.contentType);
					res.end(await register.metrics());
				} catch (err) {
					res.statusCode = 500;
					res.end((<Error>err)?.message);
				}
			} else {
				res.statusCode = 404;
				res.end("Not found");
			}
		});
		httpServer.listen(settings.metrics.prometheusExporterPort);
	}
};
