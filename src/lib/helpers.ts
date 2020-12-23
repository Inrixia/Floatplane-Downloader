import db from "@inrixia/db";

import defaults from "./defaults.json";

export const writeableSettings = db<typeof defaults.settings>("./config/settings", defaults.settings);
export const settings = writeableSettings as Readonly<typeof writeableSettings>;