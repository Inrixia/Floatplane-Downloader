# Settings Wiki

Defaults for any setting is defined in the **[Defaults File](https://github.com/Inrixia/Floatplane-Downloader/blob/master/src/lib/defaults.ts)**.  
**You can find settings under /db/setttings.json**  
Note: Settings can be set in settings.json, using environment variables or passed in as arguments.
For more info on how this work see the section in environment variables in the **[Docker Wiki](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/docker.md)** and **[Advanced Env Info](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/advenv.md)**
<br><br>

**runQuickstartPrompts**:  
Setting this to true will cause the quickStartPrompts to run on startup.

```ts
"runQuickstartPrompts": false
```

<br>

## Floatplane

**floatplane.videosToSearch**:  
Number of videos to search through when looking for undownloaded videos **per subscription**.

```json
"floatplane": {
    "videosToSearch": 5
}
```

<br>

**floatplane.videoResolution**:  
Resolution to download the videos in. See `_availableResolutions` for options.

```json
"floatplane": {
    "videoResolution": 1080
}
```

<br>

**floatplane.waitForNewVideos**:  
Controls if the downloader should wait for new videos to download after finishing or just exit

```json
"floatplane": {
    "waitForNewVideos": true
}
```

<br>

**floatplane.seekAndDestroy**:  
You can put video id's here and the downloader will find, sort and download them normally.

```json
"floatplane": {
    "seekAndDestroy": ["xL64iWbreb"]
}
```

<br>

## General Options

**filePathFormatting**:<br>
This defined the path/filename formatting for downloaded videos...  
You can refer to the `Path Formatting Options` section in this wiki for what can be used.  
Strings surounded by % will be replaced with their respective values.

```json
"filePathFormatting": "./videos/%channelTitle%/%channelTitle% - S%year%E%month%%day%%hour%%minute%%second% - %videoTitle%"
```

#### Path Formatting Options

The following options are available to be used:

- **%channelTitle%** Title of the channel the video belongs to
- **%year%** Year the video was released
- **%month%** Month the video was released
- **%day%** Day the video was released
- **%hour%** Hour the video was released
- **%minute%** Minute the video was released
- **%second%** Second the video was released
- **%videoTitle%** Title of the video  
  <br>

**artworkSuffix**:  
Suffix appended to artwork filename.  
Added for Kodi support as Kodi looks for artwork in the format `VideoName-thumb.png`

Windows example:

```json
"artworkSuffix": "echo %videoTitle% > example.txt"
```

<br>

**maxDownloadSpeed**:  
The maximum speed to download at in mbps.

```json
"maxDownloadSpeed": 8
```

<br>

**postProcessingCommand**:  
A command to run after each video has sucessfully downloaded.  
You can refer to the `Path Formatting Options` section in this wiki for what can be used.  
Strings surounded by % will be replaced with their respective values.

```json
"postProcessingCommand": ""
```

<br>

## Extras

**extras.stripSubchannelPrefix**:  
Removes the Subchannel prefix from the video title when a video is sorted into a subchannel.  
Note that this only works for videos that are sorted using title matching for channels. Newer channel id matching will not remove any prefix.  
For example:  
`TechLinked - SXXEXX - VideoTitle` - **true**  
vs  
`TechLinked - SXXEXX - TL: VideoTitle` - **false**

```json
"extras": {
    "stripSubchannelPrefix": true
}
```

<br>

**extras.downloadArtwork**:  
Saves video thubnails alongside each video. These are required for nice thumbnails in Plex.

```json
"extras": {
    "downloadArtwork": true
}
```

<br>

**extras.safeNfo**:  
Saves video metadata to nfo files alongside each video.

```json
"extras": {
    "safeNfo": true
}
```

<br>

**extras.promptVideos**:  
Prompts the user to confirm videos to download after fetching.

```json
"extras": {
    "promptVideos": true
}
```

<br>

**extras.considerAllNonPartialDownloaded**:  
When this is set to true the downloader will skip size checks for non `.mp4` files.  
This may result in files without muxed metadata and should only be used for recovery if your `db` is lost.

```json
"extras": {
    "considerAllNonPartialDownloaded": true
}
```

<br>

## Plex

Use **quickstartPrompts** to easily set plex settings.

**plex.sectionsToUpdate**:  
Array of sections to update on refresh.  
Each "section" is a object containing the name of the section and the server it belongs to.

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

**plex.token**:  
Plex token generated from your login details for updating remote servers.

```json
"plex": {
    "token": "xM__2bulgyDf_wulgyE5owodds"
}
```

<br>

## Subscriptions:

All the Floatplane creators you are subscribed to.  
![image](https://user-images.githubusercontent.com/6373693/115116013-86a4a480-9feb-11eb-828a-fe4fa8ba5cf9.png)  
At the creator level you can see the `creatorId` and `plan`. You can also choose to `skip` a creator and not download videos from them.  
<br>

You can add as many channels to a creator as you like, each **channel** has its own episode count and is considered its own "series".  
<br>

A **channel** is made up of a `title`, `skip`, an array of `identifiers` and `consoleColor`.  
`title` is the nice name used for the channel.  
`skip` can be set to true to skip downloading videos matched on the given channel.  
`identifiers` specify the conditions for a video to be added to a channel.  
`daysToKeepVideos` is the optional number of days to keep videos for this channe. 2 would mean only videos released within the last two days are downloaded and any older will be automatically deleted if previously downloaded.

<br>

An Identifier contains two entries `check` and `type`.  
The `check` is the string to look for.  
The `type` is where in the video returned from the floatplane api to search for the check string.
This can be `description`, `title` etc any property that exists on the video. See [FloatplaneApiDocs/getBlogPost](https://jman012.github.io/FloatplaneAPIDocs/Redoc/redoc-static.html#operation/getBlogPost) for more info...  
The identifiers `releasedAfter` and `releasedBefore` can also be used to match videos that were released before or after a specified date. You can also use `runtimeLessThan` and `runtimeGreaterThan` to only match videos whos runtime is greated or lower than the specified value in seconds. This can be used with a generic skip channel to skip videos with a runtime greater or less than the desired amount.  
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
    "daysToKeepVideos": 5
}
```

<br>

This is a channel named "Floatplane Exclusive".  
Videos that have "FP Exclusive: " in their title will be sorted into this channel.  
Videos released more than 5 days ago will be automatically deleted.  
<br>

A few more notes regarding channels:

- First come first served, the first channel a video matches to is what it goes into, channels are checked top to bottom in the config. Videos cannot be sorted into multiple channels.
- You can have multiple identifiers per channel to allow for more accurate matching.
- The `check` string is removed from the video's title if the `type`is equal to "title".
