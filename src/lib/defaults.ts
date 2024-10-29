import { Resolutions, Channels, Settings, Args } from "./types.js";
import { getBinaryFilename, detectPlatform } from "ffbinaries";

export const defaultResolutions: Resolutions = ["360", "720", "1080", "2160"];
export const defaultSubChannels: Record<string, Channels> = {
	"59f94c0bdd241b70349eb72b": [
		{
			title: "TalkLinked",
			skip: false,
			isChannel: "(post) => post.title?.toLowerCase().includes('talklinked')",
		},
		{
			title: "TechLinked Shorts",
			skip: false,
			isChannel: "(post) => post.title?.toLowerCase().includes('tl short: ')",
		},
		{
			title: "The WAN Show",
			skip: false,
			isChannel: "(post) => post.title?.toLowerCase().includes('wan show')",
		},
		{
			title: "LMG Livestream VODs",
			skip: false,
			isChannel: "(post) => post.title?.toLowerCase().includes('livestream vod – ')",
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
	workPath: "./db",
	ffmpegPath: "",
	settingsPath: "",
	cookiesPath: "",
	attachmentsPath: "",
};
export function fixArgs(args: Args) {
	if (args.ffmpegPath === "") {
		args.ffmpegPath = `${args.workPath}/${getBinaryFilename("ffmpeg", detectPlatform() )}`;
	}
	if (args.settingsPath === "") {
		args.settingsPath = `${args.workPath}/settings.json`;
	}
	if (args.cookiesPath === "") {
		args.cookiesPath = `${args.workPath}/cookies.json`;
	}
	if (args.attachmentsPath === "") {
		args.attachmentsPath = `${args.workPath}/attachments.json`;
	}
}

export const defaultSettings: Settings = {
	__SettingsWiki: "https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/settings.md",
	runQuickstartPrompts: true,
	floatplane: {
		videosToSearch: 5,
		videoResolution: "1080",
		waitForNewVideos: true,
		seekAndDestroy: [],
	},
	maxDownloadSpeed: -1,
	plex: {
		sectionsToUpdate: [],
		enabled: false,
		token: "",
	},
	filePathFormatting: "./videos/%channelTitle%/%channelTitle% - S%year%E%month%%day%%hour%%minute%%second% - %videoTitle%",
	extras: {
		stripSubchannelPrefix: true,
		downloadArtwork: true,
		saveNfo: true,
		considerAllNonPartialDownloaded: false,
	},
	artworkSuffix: "",
	postProcessingCommand: "",
	subscriptions: {},
	metrics: {
		prometheusExporterPort: null,
		contributeMetrics: true,
	},
};
