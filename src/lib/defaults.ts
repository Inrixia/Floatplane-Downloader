import { Resolutions, SubChannels, Settings } from "./types";

export const defaultResoulutions: Resolutions = [360, 720, 1080, 2160];
export const defaultSubChannels: { [key: string]: SubChannels } = {
	"Linus Tech Tips": {
		"_default": {
			title: "Linus Tech Tips",
			skip: false,
			identifier: false,
		},
		"Floatplane Exclusive": {
			title: "Floatplane Exclusive",
			skip: false,
			identifier: {
				check: "FP Exclusive",
				type: "title",
			},
		},
		"TechLinked": {
			title: "TechLinked",
			skip: false,
			identifier: {
				check: "NEWS SOURCES",
				type: "description",
			},
		},
		"TechQuickie": {
			title: "TechQuickie",
			skip: false,
			identifier: {
				check: "TQ:",
				type: "title",
			},
		},
		"TalkLinked": {
			title: "TalkLinked",
			skip: false,
			identifier: {
				check: "talklinked",
				type: "description",
			},
		},
		"Carpool Critics": {
			title: "Carpool Critics",
			skip: false,
			identifier: {
				check: "CC:",
				type: "title",
			},
		},
		"ShortCircut": {
			title: "ShortCircut",
			skip: false,
			identifier: {
				check: "SC:",
				type: "title",
			},
		},
		"LMG Livestream VODs": {
			title: "LMG Livestream VODs",
			skip: false,
			identifier: {
				check: "Livestream VOD",
				type: "title"
			}
		}
	}
};
export const defaultSettings: Settings = {
	runQuickstartPrompts: true,
	downloadThreads: -1,
	floatplane: {
		findClosestEdge: true,
		videoResolution: 1080,
		edge: "edge02-na.floatplane.com",
		videosToSearch: 5,
	},
	_filePathFormattingOPTIONS: ["%channelTitle%", "%episodeNumber%", "%videoTitle%", "%year%", "%month%"],
	filePathFormatting: "%channelTitle%/%channelTitle% - S01E%episodeNumber% - %videoTitle%",
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
	plex: {
		sectionsToUpdate: [],
		enabled: true,
		token: "",
	},
	channelAliases: {
		"linus tech tips": "Linus Tech Tips",
		"ltt supporter (og)": "Linus Tech Tips",
		"ltt supporter (1080p)": "Linus Tech Tips",
		"ltt supporter plus": "Linus Tech Tips",
	},
	subscriptions: {},
	colourList: {
		"Linus Tech Tips": "\u001b[38;5;208m",
		"The WAN Show": "\u001b[38;5;208m",
		"Channel Super Fun": "\u001b[38;5;220m",
		"Floatplane Exclusive": "\u001b[38;5;200m",
		"TechLinked": "\u001b[38;5;14m",
		"TechQuickie": "\u001b[38;5;153m",
		"Tech Deals": "\u001b[38;5;10m",
		"BitWit Ultra": "\u001b[38;5;105m",
		"TalkLinked": "\u001b[36m",
		"LTT Supporter (OG)": "\u001b[38;5;153m",
	},
};
