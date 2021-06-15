import { loopError } from "@inrixia/helpers/object";
import { floatplane, plex } from "./lib/prompts";
import { fApi } from "./lib/FloatplaneAPI";
import { MyPlexAccount } from "@ctrl/plex";
import { args } from "./lib/helpers";

export const loginFloatplane = async (): Promise<void> => {
	let loginResponse;
	if (args.headless === true) {
		if (args.username === undefined || args.password === undefined) throw new Error("Need floatplane username/password to login. Please pass them as --username=\"\" --password=\"\" or enviroment variables!");
		loginResponse = await fApi.auth.login(args.username, args.password);

		if (loginResponse.needs2FA) {
			if (args.token === undefined) throw new Error("Need floatplane 2Factor token to login. Please pass it as --token=\"\" or an enviroment variable!");
			loginResponse = await fApi.auth.factor(args.token);
		}
	} else {
		loginResponse = await loopError(async () => fApi.auth.login(await floatplane.username(), await floatplane.password()), async err => console.error(`\nLooks like those login details didnt work, Please try again... ${err}`));

		if (loginResponse.needs2FA) {
			console.log("Looks like you have 2Factor authentication enabled. Nice!\n");
			loginResponse = await loopError(async () => fApi.auth.factor(await floatplane.token()), async err => console.error(`\nLooks like that 2Factor token didnt work, Please try again... ${err}`));
		}
	}
	console.log(`\nSigned in as \u001b[36m${loginResponse.user.username}\u001b[0m!\n`);
};

export const loginPlex = async (): Promise<string> => {
	let plexToken: string;
	if (args.headless === true) {
		if (args.plexUsername === undefined || args.plexPassword === undefined) throw new Error("Need plex username/password to login. Please pass them as --plexUsername=\"\" --plexPassword=\"\" or enviroment variables!");
		plexToken = await loopError(
			async () => (await new MyPlexAccount(undefined, args.plexUsername, args.plexPassword).connect()).token, 
			async err => console.error(`\nLooks like those login details didnt work, Please try again... ${err}`)
		) as string;
	} else {
		console.log("\n> Please enter your plex details. (Username and Password is not saved, only used to generate a token.)");
		plexToken = await loopError(
			async () => (await new MyPlexAccount(undefined, await plex.username(), await plex.password()).connect()).token, 
			async err => console.error(`\nLooks like those login details didnt work, Please try again... ${err}`)
		) as string;
		console.log(`> Fetched plex token: \u001b[36m${plexToken}\u001b[0m!\n`);	
	}
	return plexToken;
};