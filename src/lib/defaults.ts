import { Resolutions, SubChannels, Settings, Args } from "./types";

export const defaultResoulutions: Resolutions = ["360", "720", "1080", "2160"];
export const defaultSubChannels: { [key: string]: SubChannels } = {
	"Linus Tech Tips": {
		"_default": {
			title: "Linus Tech Tips",
			skip: false,
			identifiers: false,
		},
		"Floatplane Exclusive": {
			title: "Floatplane Exclusive",
			skip: false,
			identifiers: [{
				check: "FP Exclusive: ",
				type: "title",
			}],
		},
		"TalkLinked": {
			title: "TalkLinked",
			skip: false,
			identifiers: [{
				check: "talklinked",
				type: "text",
			}],
		},
		"TechLinked": {
			title: "TechLinked",
			skip: false,
			identifiers: [{
				check: "TL: ",
				type: "title",
			}],
		},
		"TechQuickie": {
			title: "TechQuickie",
			skip: false,
			identifiers: [{
				check: "TQ: ",
				type: "title",
			}],
		},
		"Carpool Critics": {
			title: "Carpool Critics",
			skip: false,
			identifiers: [{
				check: "CC: ",
				type: "title",
			}],
		},
		"ShortCircut": {
			title: "ShortCircut",
			skip: false,
			identifiers: [{
				check: "SC: ",
				type: "title",
			}],
		},
		"LMG Livestream VODs": {
			title: "LMG Livestream VODs",
			skip: false,
			identifiers: [{
				check: "Livestream VOD – ",
				type: "title"
			}]
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
	repeat: {
		enabled: true,
		interval: "00:05:00",
	},
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