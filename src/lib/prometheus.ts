import { collectDefaultMetrics, Gauge, register } from "prom-client";
import { createServer } from "http";
import WebSocket from "ws";

import { DownloaderVersion, settings } from "./helpers/index.js";

collectDefaultMetrics();

new Gauge({
	name: "instance",
	help: "Floatplane Downloader instances",
	labelNames: ["version"],
})
	.labels({ version: DownloaderVersion })
	.set(1);

let socket: WebSocket | undefined;
let reconnectTimeout: NodeJS.Timeout;
export const initProm = (instance: string) => {
	if (settings.metrics.contributeMetrics) {
		const connect = () => {
			const onError = () => {
				socket?.terminate();
				clearTimeout(reconnectTimeout);
				reconnectTimeout = setTimeout(connect, 1000);
			};
			socket?.terminate();
			socket = new WebSocket("ws://targets.monitor.spookelton.net");
			socket.on("open", () => socket?.send(instance));
			socket.on("ping", async () => {
				try {
					socket?.send(await register.metrics());
				} catch {
					onError();
				}
			});
			socket.on("error", onError);
			socket.on("close", onError);
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
