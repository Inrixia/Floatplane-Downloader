import fs from "fs/promises";
import { constants } from "fs";

export const fileExists = async (path: string): Promise<boolean> => {
	try {
		await fs.access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
};
