import { collectDefaultMetrics, register, Gauge } from "prom-client";
import { Socket } from "net";
import { createServer } from "http";
import { settings, DownloaderVersion } from "./lib/helpers.js";

export const initProm = (instance: string) => {
	collectDefaultMetrics();

	new Gauge({
		name: "fpd_instance",
		help: "Floatplane Downloader instances",
		labelNames: ["version"],
	})
		.labels({ version: DownloaderVersion })
		.set(1);

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
