import chalk from "chalk-template";
import type { ContentPost } from "floatplane/content";
import { settings, fApi } from "./lib/helpers/index.js";

export async function* seekAndDestroy(): AsyncGenerator<ContentPost, void, unknown> {
	while (settings.floatplane.seekAndDestroy.length > 0) {
		const guid = settings.floatplane.seekAndDestroy.pop();
		if (guid === undefined) continue;
		console.log(chalk`Seek and Destroy: {red ${guid}}`);
		yield fApi.content.post(guid);
	}
}
