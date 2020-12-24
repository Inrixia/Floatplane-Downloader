import { Resolutions, SubChannels, Settings, ChannelAliases, AuthDB } from "./types";

export const defaultResoulutions: Resolutions = [360, 720, 1080, 2160];
export const defaultChannelAliases: ChannelAliases = {
	"linus tech tips": "Linus Tech Tips",
	"ltt supporter (og)": "Linus Tech Tips",
	"ltt supporter (1080p)": "Linus Tech Tips",
	"ltt supporter plus": "Linus Tech Tips",
};
export const defaultAuthDB: AuthDB = {
	plex: {
		token: "",
		username: "",
		password: ""
	}
}
export const defaultSubChannels: SubChannels = {
	"Linus Tech Tips": {
		channels: [
			{
				title: "Floatplane Exclusive",
				skip: false,
				identifier: {
					check: "FP EXCLUSIVE",
					type: "title",
				},
			},
			{
				title: "TechLinked",
				skip: false,
				identifier: {
					check: "QUICK BITS",
					type: "description",
				},
			},
			{
				title: "TechQuickie",
				skip: false,
				identifier: {
					check: "tq:",
					type: "title",
				},
			},
			{
				title: "TalkLinked",
				skip: false,
				identifier: {
					check: "talklinked",
					type: "description",
				},
			},
			{
				title: "Carpool Critics",
				skip: false,
				identifier: {
					check: "CC:",
					type: "title",
				},
			},
			{
				title: "ShortCircut",
				skip: false,
				identifier: {
					check: "SC:",
					type: "title",
				},
			},
		],
	},
};
export const defaultSettings: Settings = {
	runQuickstartPrompts: true,
	videoFolder: "./videos/",
	downloadThreads: -1,
	floatplane: {
		findClosestEdge: true,
		videoResolution: 1080,
		edge: "edge02-na.floatplane.com",
		videosToSearch: 5,
	},
	_fileFormattingOPTIONS: ["%channelTitle%", "%episodeNumber%", "%videoTitle%", "%year%", "%month%"],
	fileFormatting: "%channelTitle%/%channelTitle% - S01E%episodeNumber% - %videoTitle%",
	auth: {
		encrypt: true,
		encryptionKey: "goAwaehOrIShallTauntYouASecondTiem",
	},
	repeat: {
		enabled: true,
		interval: "00:05:00",
	},
	extras: {
		downloadArtwork: true,
		saveNfo: true,
	},
	downloadUpdateTime: 250,
	subscriptions: {},
	plex: {
		sectionsToUpdate: [],
		enabled: true,
		hostname: "",
		port: 32400,
	},
	colourList: {
		"Linus Tech Tips": "\u001b[38;5;208m",
		"The WAN Show": "\u001b[38;5;208m",
		"Channel Super Fun": "\u001b[38;5;220m",
		"Floatplane Exclusive": "\u001b[38;5;200m",
		TechLinked: "\u001b[38;5;14m",
		TechQuickie: "\u001b[38;5;153m",
		"Tech Deals": "\u001b[38;5;10m",
		"BitWit Ultra": "\u001b[38;5;105m",
		TalkLinked: "\u001b[36m",
		"LTT Supporter (OG)": "\u001b[38;5;153m",
	},
};
