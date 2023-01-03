# Settings Wiki

Defaults for any setting is defined in the **[Defaults File](https://github.com/Inrixia/Floatplane-Downloader/blob/master/src/lib/defaults.ts)**.<br>
**You can find settings under /db/setttings.json**<br>
Note: Settings can be set in settings.json, using environment variables or passed in as arguments.
For more info on how this work see the section in environment variables in the **[Docker Wiki](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/docker.md)** and **[Advanced Env Info](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/advenv.md)**
<br><br>

**runQuickstartPrompts**:<br>
Setting this to true will cause the quickStartPrompts to run on startup.

```ts
"runQuickstartPrompts": false
```

<br>

**downloadThreads**:<br>
Sets the maximum amount of downloads that can run concurrently. Default's to -1 which is unlimited, 2 would mean only 2 videos download at once.<br>

```json
"downloadThreads": -1
```

<br>

## Floatplane

**floatplane.videosToSearch**:<br>
Number of videos to search through when looking for undownloaded videos **per subscription**.<br>

```json
"floatplane": {
    "videosToSearch": 5
}
```

<br>

**floatplane.forceFullSearch**:<br>
Force the downloader to search the full `videosToSearch` regardless of what has been downloaded. Note: Will not result in downloaded videos being redownloaded.<br>

```json
"floatplane": {
    "forceFullSearch": true
}
```

<br>

**floatplane.videoResolution**:<br>
Resolution to download the videos in. See `_availableResolutions` for options.<br>

```json
"floatplane": {
    "videoResolution": 1080
}
```

<br>

**floatplane.waitForNewVideos**:<br>
Controls if the downloader should wait for new videos to download after finishing or just exit<br>

```json
"floatplane": {
    "waitForNewVideos": true
}
```

<br>

**floatplane.downloadEdge**:<br>
If not set to "", overrides the download edge used for video downloads.<br>

```json
"floatplane": {
    "downloadEdge": "edge03-na.floatplane.com"
}
```

<br>

**floatplane.retries**:<br>
Sets the number of times a download will retry before giving up.<br>
Defaults to 3

```json
"floatplane": {
    "retries": 3
}
```

<br>

**floatplane.seekAndDestroy**:<br>
You can put video id's here and the downloader will find, sort and download them normally.<br>

```json
"floatplane": {
    "seekAndDestroy": ["xL64iWbreb"]
}
```

<br>

**filePathFormatting**:<br>
This defined the path/filename formatting for downloaded videos...<br>
You can refer to `_filePathFormattingOPTIONS` for options on what can be used.<br>
Strings surounded by % will be replaced with their respective values.<br>

```json
"filePathFormatting": "./videos/%channelTitle%/%channelTitle% - S%year%E%month%%day%%hour%%minute%%second% - %videoTitle%"
```

<br>

## Extras

**extras.stripSubchannelPrefix**:<br>
Removes the Subchannel prefix from the video title when a video is sorted into a subchannel.<br>
For example:<br>
`TechLinked - SXXEXX - VideoTitle` - **true**<br>
vs
<br>
`TechLinked - SXXEXX - TL: VideoTitle` - **false**

```json
"extras": {
    "stripSubchannelPrefix": true
}
```

<br>

**extras.downloadArtwork**:<br>
Saves video thubnails alongside each video. These are required for nice thumbnails in Plex.<br>

```json
"extras": {
    "downloadArtwork": true
}
```

<br>

**extras.safeNfo**:<br>
Saves video metadata to nfo files alongside each video.<br>

```json
"extras": {
    "safeNfo": true
}
```

<br>

**artworkSuffix**:<br>
Suffix appended to artwork filename.<br>
Added for Kodi support as Kodi looks for artwork in the format `VideoName-thumb.png`

Windows example:

```json
"artworkSuffix": "echo %videoTitle% > example.txt"
```

<br>

**postProcessingCommand**:<br>
A command to run after each video has sucessfully downloaded.<br>
You can refer to `_filePathFormattingOPTIONS` for options on what can be used.<br>
Strings surounded by % will be replaced with their respective values.<br>

```json
"postProcessingCommand": ""
```

<br>

**considerAllNonPartialDownloaded**:<br>
When this is set to true the downloader will skip size checks for non `.mp4` files.<br>
This may result in files without muxed metadata and should only be used for recovery if your `db` is lost.<br>

```json
"considerAllNonPartialDownloaded": true
```

<br>

## Plex

Use **quickstartPrompts** to easily set plex settings.

**plex.sectionsToUpdate**:<br>
Array of sections to update on refresh.<br>
Each "section" is a object containing the name of the section and the server it belongs to.<br>

```json
"plex": {
    "sectionsToUpdate": [
        {
            "server": "ServerA",
            "section": "Floatplane"
        },
        {
            "server": "ServerB",
            "section": "Floatplane"
        }
    ]
}
```

<br>

**plex.token**:<br>
Plex token generated from your login details for updating remote servers.<br>

```json
"plex": {
    "token": "xM__2bulgyDf_wulgyE5owodds"
}
```

<br>

**channelAliases**:<br>
Array of alias's used to convert subscription names to nice channel names.<br>

```json
"channelAliases": {
    "linus tech tips": "Linus Tech Tips",
    "ltt supporter (og)": "Linus Tech Tips",
    "ltt supporter (1080p)": "Linus Tech Tips",
    "ltt supporter plus": "Linus Tech Tips"
}
```

<br>

## Subscriptions:

All the Floatplane creators you are subscribed to.<br>
![image](https://user-images.githubusercontent.com/6373693/115116013-86a4a480-9feb-11eb-828a-fe4fa8ba5cf9.png)<br>
At the creator level you can see the `creatorId` and `plan`. You can also choose to `skip` a creator and not download videos from them.<br>
<br>

All creators will have a `_default` channel, this is what videos are sorted under by default if there are no other channels that match.<br>
You can add as many channels to a creator as you like, each **channel** has its own episode count and is considered its own "series".<br>
<br>

A **channel** is made up of a `title`, `skip`, an array of `identifiers` and `consoleColor`.<br>
`title` is the nice name used for the channel.<br>
`skip` can be set to true to skip downloading videos matched on the given channel.<br>
`identifiers` specify the conditions for a video to be added to a channel.<br>
`consoleColor` is optional and is used for having colors in console output for seperate channels.<br>
`daysToKeepVideos` is the number of days to keep videos for this channe. Default's to -1 which is unlimited, 2 would mean only videos released within the last two days are downloaded and any older will be automatically deleted if previously downloaded.

<br>
<br>

An Identifier contains two entries `check` and `type`.<br>
`check` is the string to look for.<br>
`type` is where in the video returned from the floatplane api to search for the check string.<br>
<br>

For example:

```json
"Floatplane Exclusive": {
    "title": "Floatplane Exclusive",
    "skip": false,
    "identifiers": [
        {
            "check": "FP Exclusive: ",
            "type": "title"
        }
    ],
    "consoleColor": "\u001b[38;5;200m",
    "daysToKeepVideos": -1
}
```

This is a channel named "Floatplane Exclusive".<br>
Videos that have "FP Exclusive: " in their title will be sorted into this channel.<br>
<br>

A few more notes regarding channels:<br>

- First come first served, the first channel a video matches to is what it goes into, channels are checked top to bottom in the config. Videos cannot be sorted into multiple channels.
- You can have multiple identifiers per channel to allow for more accurate matching.
- The `check` string is removed from the video's title if the `type`is equal to "title".
