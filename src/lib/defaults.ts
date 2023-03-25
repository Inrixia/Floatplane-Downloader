import { Resolutions, SubChannels, Settings, Args } from "./types.js";

export const defaultResolutions: Resolutions = ["360", "720", "1080", "2160"];
export const defaultSubChannels: Record<string, SubChannels> = {
	"Tech Deals": [
		{
			title: "Teach Deals",
			skip: false,
			consoleColor: "\u001b[38;5;10m",
			daysToKeepVideos: -1,
		},
	],
	"BitWit Ultra": [
		{
			title: "BitWit Ultra",
			skip: false,
			consoleColor: "\u001b[38;5;105m",
			daysToKeepVideos: -1,
		},
	],
	"Linus Tech Tips": [
		{
			title: "Linus Tech Tips",
			skip: false,
			consoleColor: "\u001b[38;5;208m",
			daysToKeepVideos: -1,
		},
		{
			title: "Mac Address",
			skip: false,
			identifiers: [
				{
					check: "MA: ",
					type: "title",
				},
			],
			consoleColor: "\u001b[38;5;189m",
			daysToKeepVideos: -1,
		},
		{
			title: "Floatplane Exclusive",
			skip: false,
			identifiers: [
				{
					check: "FP Exclusive: ",
					type: "title",
				},
			],
			consoleColor: "\u001b[38;5;200m",
			daysToKeepVideos: -1,
		},
		{
			title: "TalkLinked",
			skip: false,
			identifiers: [
				{
					check: "talklinked",
					type: "title",
				},
			],
			consoleColor: "\u001b[36m",
			daysToKeepVideos: -1,
		},
		{
			title: "TechLinked",
			skip: false,
			identifiers: [
				{
					check: "TL: ",
					type: "title",
				},
			],
			consoleColor: "\u001b[38;5;14m",
			daysToKeepVideos: -1,
		},
		{
			title: "TechLinked Shorts",
			skip: false,
			identifiers: [
				{
					check: "TL Short: ",
					type: "title",
				},
			],
			consoleColor: "\u001b[38;5;14m",
			daysToKeepVideos: -1,
		},
		{
			title: "TechQuickie",
			skip: false,
			identifiers: [
				{
					check: "TQ: ",
					type: "title",
				},
			],
			consoleColor: "\u001b[38;5;153m",
			daysToKeepVideos: -1,
		},
		{
			title: "Theyre Just Movies",
			skip: false,
			identifiers: [
				{
					check: "TJM: ",
					type: "title",
				},
				{
					check: "CC: ",
					type: "title",
				},
				{
					check: "'Carpool Critics': ",
					type: "title",
				},
				{
					check: "Movie Podcast: ",
					type: "title",
				},
				{
					check: "Movie Podcast : ",
					type: "title",
				},
			],
			daysToKeepVideos: -1,
		},
		{
			title: "ShortCircuit",
			skip: false,
			identifiers: [
				{
					check: "SC: ",
					type: "title",
				},
			],
			daysToKeepVideos: -1,
		},
		{
			title: "ChannelSuperFun",
			skip: false,
			identifiers: [
				{
					check: "CSF: ",
					type: "title",
				},
			],
			consoleColor: "\u001b[38;5;220m",
			daysToKeepVideos: -1,
		},
		{
			title: "The WAN Show",
			skip: false,
			identifiers: [
				{
					check: "WAN Show",
					type: "title",
				},
			],
			consoleColor: "\u001b[38;5;208m",
			daysToKeepVideos: -1,
		},
		{
			title: "LMG Livestream VODs",
			skip: false,
			identifiers: [
				{
					check: "Livestream VOD – ",
					type: "title",
				},
			],
			consoleColor: "\u001b[38;5;208m",
			daysToKeepVideos: -1,
		},
	],
};

export const defaultArgs: Args = {
	username: "",
	password: "",
	token: "",
	headless: false,
	plexUsername: "",
	plexPassword: "",
	sanityCheck: false,
};

export const defaultSettings: Settings = {
	runQuickstartPrompts: true,
	floatplane: {
		videosToSearch: 5,
		forceFullSearch: false,
		videoResolution: "1080",
		waitForNewVideos: true,
		_availableResolutions: defaultResolutions,
		seekAndDestroy: [],
	},
	_filePathFormattingOPTIONS: ["%channelTitle%", "%videoTitle%", "%year%", "%month%", "%day%", "%hour%", "%minute%", "%second%"],
	filePathFormatting: "./videos/%channelTitle%/%channelTitle% - S%year%E%month%%day%%hour%%minute%%second% - %videoTitle%",
	extras: {
		stripSubchannelPrefix: true,
		downloadArtwork: true,
		saveNfo: true,
		promptVideos: false,
	},
	artworkSuffix: "",
	plex: {
		sectionsToUpdate: [],
		enabled: false,
		token: "",
	},
	channelAliases: {
		"linus tech tips": "Linus Tech Tips",
		"ltt supporter (og)": "Linus Tech Tips",
		"ltt supporter (1080p)": "Linus Tech Tips",
		"ltt supporter plus": "Linus Tech Tips",
	},
	subscriptions: {},
	postProcessingCommand: "",
	considerAllNonPartialDownloaded: false,
};
