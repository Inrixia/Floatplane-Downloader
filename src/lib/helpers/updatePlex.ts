import { MyPlexAccount } from "@ctrl/plex";
import { settings } from "./index";

let plexApi: MyPlexAccount;
export const updatePlex = async () => {
	plexApi ??= await new MyPlexAccount(undefined, undefined, undefined, settings.plex.token).connect();
	for (const sectionToUpdate of settings.plex.sectionsToUpdate) {
		const resource = await plexApi.resource(sectionToUpdate.server);
		const server = await resource.connect();
		const library = await server.library();
		const section = await library.section(sectionToUpdate.section);
		await section.refresh();
	}
};
