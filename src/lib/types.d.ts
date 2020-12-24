export type Resolutions = [360, 720, 1080, 2160];

import type { Video as fApiVideo } from "floatplane/creator";
export type ChannelOptions = {
	creator?: string;
	title: string;
	skip: boolean;
	identifier: {
		check: string;
		type: keyof fApiVideo;
	};
};

export type ChannelAliases = { [key: string]: string };
export type SubChannels = {
	[key: string]: {
		channels: ChannelOptions[];
	};
};

export type AuthDB = {
	plex: {
		token: string,
		username: string,
		password: string
	}
}

export type PlexSettings = {
	sectionsToUpdate: string[];
	enabled: boolean;
	hostname: string;
	port: number;
}

export type Extras = { [key: string]: boolean }
export type Settings = {
	firstLaunch: boolean;
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
	subscriptions: {
		[key: string]: {
			creator: string,
			title: string,
			skip: boolean,
			channels: ChannelOptions[]
		}
	};
	plex: PlexSettings;
	colourList: {
		[key: string]: string;
	};
};
