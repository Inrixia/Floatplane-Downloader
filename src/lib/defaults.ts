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
				type: "text",
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
		"ShortCircut": {
			title: "ShortCircut",
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
	docker: false
};

export const defaultSettings: Settings = {
	runQuickstartPrompts: true,
	downloadThreads: -1,
	floatplane: {
		videoResolution: "1080",
		videosToSearch: 5,
		_avalibleResolutions: defaultResoulutions,
	},
	ffmpegPath: "./db/",
	_filePathFormattingOPTIONS: ["%channelTitle%", "%episodeNumber%", "%videoTitle%", "%year%", "%month%"],
	filePathFormatting: "./videos/%channelTitle%/%channelTitle% - S01E%episodeNumber% - %videoTitle%",
	extras: {
		downloadArtwork: true,
		saveNfo: true,
	},
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
	subscriptions: {}
};