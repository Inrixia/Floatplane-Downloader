import { loopError } from "@inrixia/helpers/object";
import { plex } from "./lib/prompts/index.js";
import { fApi, args } from "./lib/helpers/index.js";
import { MyPlexAccount } from "@ctrl/plex";

import type { LoginSuccess } from "floatplane/auth";
export type User = LoginSuccess["user"];

export const loginFloatplane = async (): Promise<User> => {
	if ((await fApi.isAuthenticated()) !== true) {
		let loopCounter = 0;
		await loopError(
			async () => {
				const loginResponse = await fApi.deviceLogin();
				return loginResponse;
			},
			async (err) => {
				loopCounter++;
				console.error(`\nLooks like those login details didnt work, Please try again... ${err}`);
				if (loopCounter >= 5) {
					console.error("Failed to login to floatplane after 5 attempts!");
					throw err;
				}
			},
		);
	}

	const self = await fApi.user.self();
	console.log(`\nLogged in as \u001b[36m${self.username}\u001b[0m!\n`);
	return self;
};

export const loginPlex = async (): Promise<string> => {
	let plexToken: string;
	if (args.headless === true) {
		if (args.plexUsername === undefined || args.plexPassword === undefined)
			throw new Error('Need plex username/password to login. Please pass them as --plexUsername="" --plexPassword="" or enviroment variables!');
		plexToken = (await loopError(
			async () => (await new MyPlexAccount(undefined, args.plexUsername, args.plexPassword).connect()).token,
			async (err) => console.error(`\nLooks like those login details didnt work, Please try again... ${err}`),
		)) as string;
	} else {
		console.log("\n> Please enter your plex details. (Username and Password is not saved, only used to generate a token.)");
		plexToken = (await loopError(
			async () => (await new MyPlexAccount(undefined, await plex.username(), await plex.password()).connect()).token,
			async (err) => console.error(`\nLooks like those login details didnt work, Please try again... ${err}`),
		)) as string;
		console.log(`> Fetched plex token: \u001b[36m${plexToken}\u001b[0m!\n`);
	}
	return plexToken;
};
