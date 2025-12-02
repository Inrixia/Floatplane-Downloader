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

```json
"artworkSuffix": ""
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
"postProcessingCommand": "echo %videoTitle% > example.txt"
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

**extras.downloadCaptions**:  
Saves video captions alongside each video.

```json
"extras": {
    "downloadCaptions": true
}
```

**extras.safeNfo**:  
Saves video metadata to nfo files alongside each video.

```json
"extras": {
    "saveNfo": true
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
![image](https://github.com/Inrixia/Floatplane-Downloader/assets/6373693/9535456d-158a-4ead-b355-8d3155a8d979)
At the creator level you can see the `creatorId` and `plan`. You can also choose to `skip` a creator and not download videos from them.  
You can add custom channels to a creator if you want.
<br>

First come first served, the first channel a video matches to is what it goes into, channels are checked top to bottom in the config. Videos cannot be sorted into multiple channels.
<br>

A **channel** is made up of a `title`, `skip`, `isChannel` and optionally `daysToKeepVideos`.  
`title` is the nice name used for the channel.  
`skip` can be set to true to skip downloading videos matched on the given channel.  
`isChannel` function that returns true or false if the video should be sorted into this channel (more on this further down).  
`daysToKeepVideos` is the optional number of days to keep videos for this channel. **2** would mean only videos released within the **last two days** are downloaded and any older will be **automatically deleted** if previously downloaded.

<br>

**isChannel** is a function that accepts a **[post](https://jman012.github.io/FloatplaneAPIDocs/Redoc/redoc-static.html#tag/ContentV3/operation/getBlogPost)** which is the post the video belongs to and **[video](https://jman012.github.io/FloatplaneAPIDocs/Redoc/redoc-static.html#tag/ContentV3/operation/getVideoContent)** which is one or more videos belonging to that post.

If it returns **true** the video is sorted into the channel, **false** and its not.
This gives the flexibility to create completely custom channels based on any properties of a post or video.
<br>

For example:

```json
{
	"title": "Creators with Technology in their Description",
	"skip": false,
	"isChannel": "(post, video) => post.creator?.description?.toLowercase()?.includes('technology')",
	"daysToKeepVideos": 5
}
```

<br>

## Metrics:

**metrics.prometheusExporterPort**:  
Default is `null` if set to a number prometheus metrics will be made availible at that port.

```json
"metrics": {
    "prometheusExporterPort": 8080,
}
```

<br>

**metrics.contributeMetrics**:  
If true metrics will be included in the aggregate dashboard.

```json
"metrics": {
    "contributeMetrics": true
}
```
