import { MyPlexAccount } from "@ctrl/plex";

import { loopError } from "@inrixia/helpers/object";

import type FloatplaneApi from "floatplane";

import { floatplane, plex } from "./lib/prompts";

export const loginFloatplane = async (fApi: FloatplaneApi) => {
	let loginResponse = await loopError(async () => fApi.auth.login(await floatplane.username(), await floatplane.password()), async err => console.error(`\nLooks like those login details didnt work, Please try again... ${err}`));

	if (loginResponse.needs2FA) {
		console.log("Looks like you have 2Factor authentication enabled. Nice!\n");
		loginResponse = await loopError(async () => fApi.auth.factor(await floatplane.token()), async err => console.error(`\nLooks like that 2Factor token didnt work, Please try again... ${err}`));
	}
	console.log(`\nSigned in as ${loginResponse.user.username}!\n`);
};

export const loginPlex = async (plexHostname: string, plexPort: number) => {
	console.log("\nPlease enter your plex details. (Username and Password is not saved, only used to generate a token.)");
	const username = await plex.username();
	const password = await plex.password();
	const plexToken = (await new MyPlexAccount(`${plexHostname}:${plexPort}`, username, password).connect()).token as string;
	console.log(`Fetched plex token: ${plexToken}\n`);
	return plexToken;
};