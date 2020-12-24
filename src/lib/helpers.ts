import db from "@inrixia/db";

import type { Settings, ChannelAliases, SubChannels } from "./types"
import { defaultSettings, defaultSubChannels, defaultChannelAliases } from "./defaults";

export const writeableSettings = db<Settings>("./config/settings", defaultSettings);
export const settings = writeableSettings as Readonly<Settings>;

export const channelAliases = db<ChannelAliases>("./config/channelAliases", defaultChannelAliases) as Readonly<ChannelAliases>;
export const subChannels = db<SubChannels>("./config/subChannels", defaultSubChannels) as Readonly<SubChannels>;