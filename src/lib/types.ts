export type Resolutions = ['360', '720', '1080', '2160'];

import type { BlogPost } from 'floatplane/creator';

export type ChannelOptions = {
	title: string;
	skip: boolean;
	identifiers:
		| Array<{
				check: string;
				type: keyof BlogPost | 'description';
		  }>
		| false;
	consoleColor?: string;
};

export type SubChannels = {
	_default: ChannelOptions;
	[key: string]: ChannelOptions;
};

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
	channels: SubChannels;
};

export type Args = {
	username: string;
	password: string;
	token: string;
	headless: boolean;
	plexUsername: string;
	plexPassword: string;
};

export type PartialArgs = Partial<Args & Settings>;

export type Extras = {
	stripSubchannelPrefix: boolean;
	downloadArtwork: boolean;
	saveNfo: boolean;
};

export type ValueOf<T> = T[keyof T];

export type FilePathFormattingOptions = {
	'%channelTitle%': string;
	'%episodeNumber%': string;
	'%year%': string;
	'%month%': string;
	'%day%': string;
	'%hour%': string;
	'%minute%': string;
	'%second%': string;
	'%videoTitle%': string;
};

export type Resolution = ValueOf<Resolutions>;

export type Settings = {
	runQuickstartPrompts: boolean;
	downloadThreads: number;
	floatplane: {
		videoResolution: Resolution;
		videosToSearch: number;
		waitForNewVideos: boolean;
		_availableResolutions: Resolutions;
		downloadEdge: string;
		retries: number;
	};
	_filePathFormattingOPTIONS: (keyof FilePathFormattingOptions)[];
	filePathFormatting: string;
	extras: Extras;
	artworkSuffix: string;
	channelAliases: {
		[key: string]: string;
	};
	subscriptions: {
		[key: string]: SubscriptionSettings;
	};
	plex: PlexSettings;
	postProcessingCommand: string;
};
