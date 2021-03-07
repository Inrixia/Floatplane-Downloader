export type Resolutions = [360, 720, 1080, 2160];

import type { Video as fApiVideo } from "floatplane/creator";

export type ChannelOptions = {
	title: string;
	skip: boolean;
	identifier: {
		check: string;
		type: keyof fApiVideo;
	} | false;
};

export type SubChannels = {
	_default: ChannelOptions;
	[key: string]: ChannelOptions;
};

export type PlexSettings = {
	sectionsToUpdate: string[];
	enabled: boolean;
	token: string;
}

export type Extras = { [key: string]: boolean }

export type SubscriptionSettings = {
	creatorId: string;
	plan: string;
	skip: boolean;
	channels: SubChannels;
}

export type Settings = {
	runQuickstartPrompts: boolean;
	videoFolder: string;
	downloadThreads: number;
	floatplane: {
		findClosestEdge: boolean;
		videoResolution: ValueOf<Resolutions>;
		edge: string;
		videosToSearch: number;
	};
	_fileFormattingOPTIONS: string[];
	fileFormatting: string;
	auth: {
		encrypt: boolean;
		encryptionKey: string;
	};
	repeat: {
		enabled: boolean;
		interval: string;
	};
	extras: Extras;
	downloadUpdateTime: number;
	channelAliases: { 
		[key: string]: string 
	};
	subscriptions: {
		[key: string]: SubscriptionSettings;
	};
	plex: PlexSettings;
	colourList: {
		[key: string]: string;
	};
};
