import { MyPlexAccount } from "@ctrl/plex";

import { loopError } from "@inrixia/helpers/object";

import type FloatplaneApi from "floatplane";

import { floatplane, plex } from "./lib/prompts";

import { args } from "./lib/helpers";

export const loginFloatplane = async (fApi: FloatplaneApi): Promise<void> => {
	let loginResponse;
	if (args.docker === undefined) {
		loginResponse = await loopError(async () => fApi.auth.login(await floatplane.username(), await floatplane.password()), async err => console.error(`\nLooks like those login details didnt work, Please try again... ${err}`));

		if (loginResponse.needs2FA) {
			console.log("Looks like you have 2Factor authentication enabled. Nice!\n");
			loginResponse = await loopError(async () => fApi.auth.factor(await floatplane.token()), async err => console.error(`\nLooks like that 2Factor token didnt work, Please try again... ${err}`));
		}
	} else {
		if (args.username === undefined || args.password === undefined) throw new Error("Need floatplane username/password to login! Please pass them as --username=\"\" --password=\"\".");
		loginResponse = await fApi.auth.login(args.username, args.password);
		if (loginResponse.needs2FA) {
			if (args.token === undefined) throw new Error("Need floatplane 2Factor token to login! Please pass it as --token=\"\".");
			loginResponse = await fApi.auth.factor(args.token);
		}
	}
	console.log(`\nSigned in as \u001b[36m${loginResponse.user.username}\u001b[0m!\n`);
};

export const loginPlex = async (): Promise<string> => {
	console.log("\nPlease enter your plex details. (Username and Password is not saved, only used to generate a token.)");
	const plexToken = await loopError(async () => (await new MyPlexAccount(undefined, await plex.username(), await plex.password()).connect()).token, async err => console.error(`\nLooks like those login details didnt work, Please try again... ${err}`));
	console.log(`Fetched plex token: \u001b[36m${plexToken}\u001b[0m!\n`);
	return plexToken as string;
};