import type { OnDeviceCode } from "floatplane";
import { args } from ".";
import { requiredPrompts } from "../prompts/helpers";

import open from "open";

export const onDeviceCode: OnDeviceCode = async ({ verification_uri_complete, verification_uri }) => {
	const verifyUri = verification_uri_complete ?? verification_uri;
	const message = `Please login to Floatplane via ${verifyUri}`;
	if (args.headless) {
		console.log(message);
	} else {
		await open(verifyUri);
		await requiredPrompts({
			type: "confirm",
			name: "login",
			message,
		});
	}
};
