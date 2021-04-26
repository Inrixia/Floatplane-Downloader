import { Resolutions, SubChannels, Settings, Args } from "./types";

export const defaultResoulutions: Resolutions = ["360", "720", "1080", "2160"];
export const defaultSubChannels: { [key: string]: SubChannels } = {
	"Tech Deals": {
		_default: {
			title: "Teach Deals",
			skip: false,
			identifiers: false,
			consoleColor: "\u001b[38;5;10m"
		}
	},
	"BitWit Ultr": {
		_default: {
			title: "BitWit Ultr",
			skip: false,
			identifiers: false,
			consoleColor: "\u001b[38;5;105m"
		}
	},
	"Linus Tech Tips": {
		_default: {
			title: "Linus Tech Tips",
			skip: false,
			identifiers: false,
			consoleColor: "\u001b[38;5;208m"
		},
		"Mac Address": {
			title: "Mac Address",
			skip: false,
			identifiers: [{
				"check": "MA: ",
				"type": "title"
			}],
			consoleColor: "\u001b[38;5;189m"
		},
		"Floatplane Exclusive": {
			title: "Floatplane Exclusive",
			skip: false,
			identifiers: [{
				check: "FP Exclusive: ",
				type: "title",
			}],
			consoleColor: "\u001b[38;5;200m"
		},
		"TalkLinked": {
			title: "TalkLinked",
			skip: false,
			identifiers: [{
				check: "talklinked",
				type: "title",
			}],
			consoleColor: "\u001b[36m"
		},
		"TechLinked": {
			title: "TechLinked",
			skip: false,
			identifiers: [{
				check: "TL: ",
				type: "title",
			}],
			consoleColor: "\u001b[38;5;14m"
		},
		"TechLinked Shorts": {
			title: "TechLinked Shorts",
			skip: false,
			identifiers: [{
				check: "TL Short: ",
				type: "title",
			}],
			consoleColor: "\u001b[38;5;14m"
		},
		"TechQuickie": {
			title: "TechQuickie",
			skip: false,
			identifiers: [{
				check: "TQ: ",
				type: "title",
			}],
			consoleColor: "\u001b[38;5;153m"
		},
		"Carpool Critics": {
			title: "Carpool Critics",
			skip: false,
			identifiers: [{
				check: "CC: ",
				type: "title",
			}]
		},
		"ShortCircuit": {
			title: "ShortCircuit",
			skip: false,
			identifiers: [{
				check: "SC: ",
				type: "title",
			}],
		},
		"ChannelSuperFun": {
			title: "ChannelSuperFun",
			skip: false,
			identifiers: [{
				check: "CSF: ",
				type: "title"
			}],
			consoleColor: "\u001b[38;5;220m"
		},
		"LMG Livestream VODs": {
			title: "LMG Livestream VODs",
			skip: false,
			identifiers: [{
				check: "Livestream VOD – ",
				type: "title"
			}],
			consoleColor: "\u001b[38;5;208m"
		}
	}
};

export const defaultArgs: Args = {
	username: "",
	password: "",
	token: "",
	headless: false,
	plexUsername: "",
	plexPassword: ""
};

export const defaultSettings: Settings = {
	runQuickstartPrompts: true,
	downloadThreads: -1,
	floatplane: {
		videosToSearch: 5,
		videoResolution: "1080",
		waitForNewVideos: true,
		_avalibleResolutions: defaultResoulutions
	},
	_filePathFormattingOPTIONS: ["%channelTitle%", "%episodeNumber%", "%videoTitle%", "%year%", "%month%", "%day%", "%hour%", "%minute%", "%second%"],
	filePathFormatting: "./videos/%channelTitle%/%channelTitle% - S%year%E%month%%day%%hour%%minute%%second% - %videoTitle%",
	extras: {
		downloadArtwork: true,
		saveNfo: true,
	},
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
	subscriptions: {}
};