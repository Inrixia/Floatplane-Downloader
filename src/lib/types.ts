export type Resolutions = ["360", "720", "1080", "2160"];

import type { ValueOfA } from "@inrixia/helpers/ts";
import type { BlogPost } from "floatplane/creator";

type ChannelIdentifier = {
	check: string;
	type: keyof BlogPost | "description" | "runtimeLessThan" | "runtimeGreaterThan" | "channelId" | "releasedBefore" | "releasedAfter";
};
export type ChannelOptions = {
	title: string;
	skip: boolean;
	identifiers?: ChannelIdentifier[];
	daysToKeepVideos?: number;
};

export type Channels = ChannelOptions[];

export type PlexSections = Array<{ server: string; section: string }>;
export type PlexSettings = {
	sectionsToUpdate: PlexSections;
	enabled: boolean;
	token: string;
};

export type SubscriptionSettings = {
	creatorId: string;
	plan: string;
	skip: boolean;
	channels: Channels;
};

export type Args = {
	username: string;
	password: string;
	token: string;
	headless: boolean;
	plexUsername: string;
	plexPassword: string;
	sanityCheck: boolean;
};

export type PartialArgs = Partial<Args & Settings>;

export type Extras = {
	stripSubchannelPrefix: boolean;
	downloadArtwork: boolean;
	saveNfo: boolean;
	promptVideos: boolean;
	considerAllNonPartialDownloaded: boolean;
};

export type Resolution = ValueOfA<Resolutions>;

export type Settings = {
	__SettingsWiki: string;
	runQuickstartPrompts: boolean;
	floatplane: {
		videoResolution: Resolution;
		videosToSearch: number;
		waitForNewVideos: boolean;
		seekAndDestroy: string[];
	};
	filePathFormatting: string;
	plex: PlexSettings;
	extras: Extras;
	artworkSuffix: string;
	postProcessingCommand: string;
	subscriptions: {
		[key: string]: SubscriptionSettings;
	};
};
