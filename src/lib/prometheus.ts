import { collectDefaultMetrics, Gauge, Histogram, register } from "prom-client";
import { createServer } from "http";
import WebSocket from "ws";

import { DownloaderVersion, fApi, settings } from "./helpers.js";

export const initProm = (instance: string) => {
	collectDefaultMetrics();

	new Gauge({
		name: "instance",
		help: "Floatplane Downloader instances",
		labelNames: ["version"],
	})
		.labels({ version: DownloaderVersion })
		.set(1);

	// Add floatplane api request metrics
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
					const pathname = thumbsIndex !== -1 ? url.pathname.substring(0, thumbsIndex + 10) : url.pathname;
					httpRequestDurationmS.observe({ method: options.method, hostname: url.hostname, pathname, status: res.statusCode }, Date.now() - options._startTime);
					return res;
				},
			],
		},
	});

	if (settings.metrics.contributeMetrics) {
		const connect = () => {
			const socket = new WebSocket("ws://targets.monitor.spookelton.net");
			socket.on("open", () => socket.send(instance));
			socket.on("ping", async () => socket.send(await register.metrics()));
			socket.on("error", () => socket.close());
			socket.on("close", () => {
				socket.close();
				setTimeout(connect, 1000);
			});
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
