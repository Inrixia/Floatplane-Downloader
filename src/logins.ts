import { MyPlexAccount } from "@ctrl/plex";
import { loopError } from "@inrixia/helpers";
import { args, fApi } from "./lib/helpers/index";
import { plex } from "./lib/prompts/index";

import type { Self } from "floatplane/user";
export type User = Self;

export const loginFloatplane = async (): Promise<User> => {
	const loginResponse = await fApi.deviceLogin();
	console.log(`\nSigned in as \u001b[36m${loginResponse.username}\u001b[0m!\n`);
	return loginResponse;
};

export const loginPlex = async (): Promise<string> => {
	let plexToken: string;
	if (args.headless === true) {
		if (args.plexUsername === undefined || args.plexPassword === undefined)
			throw new Error('Need plex username/password to login. Please pass them as --plexUsername="" --plexPassword="" or enviroment variables!');
		plexToken = (await loopError(
			async () => (await new MyPlexAccount(undefined, args.plexUsername, args.plexPassword).connect()).token,
			async (err) => console.error(`\nLooks like those login details didnt work, Please try again... ${err}`)
		)) as string;
	} else {
		console.log("\n> Please enter your plex details. (Username and Password is not saved, only used to generate a token.)");
		plexToken = (await loopError(
			async () => (await new MyPlexAccount(undefined, await plex.username(), await plex.password()).connect()).token,
			async (err) => console.error(`\nLooks like those login details didnt work, Please try again... ${err}`)
		)) as string;
		console.log(`> Fetched plex token: \u001b[36m${plexToken}\u001b[0m!\n`);
	}
	return plexToken;
};
