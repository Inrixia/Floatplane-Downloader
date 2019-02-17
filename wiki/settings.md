# settings.json Info
---
This covers what each setting is and what you can change it to for after version 4.0.0 Please go read this for pre 4.0.0: [Settings_Pre_4.0.0](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/settings_pre_4.0.0.md). 

Note that "max" type settings apply separately to each channel, so maxVideos set to 4 means 4 videos for Floatplane and BitWit Ultra etc for multiple channels, if you have more than one channel enabled.
[![https://gyazo.com/c51709dc3746cfaaf10f7abbb5abae39](https://i.gyazo.com/c51709dc3746cfaaf10f7abbb5abae39.png)](https://gyazo.com/c51709dc3746cfaaf10f7abbb5abae39)

**version:**  
>Variable used in the update script. Ignore this.

**videoFolder:**

>This sets the folder the videos are downloaded to. It can be related to the scripts folder through "./" or a full system path like "C:/Users/Inrix/Downloads".
>
>Default: "**./videos/**"  
>Example:
```json 
"videoFolder": "C:/Users/Inrix/Downloads"
```

**maxVideos:**  
>States how far down the latest video posts the script should look in number of posts. You can set it to as high as you want.
>
>Note: This does not effect script performance, or increase requests to the Floatplane API below 20. After that every increase by 20 will mean another page worth of videos is loaded.
>
>Default: "**5**"  
>Example:
```json 
"maxVideos": 30
```

**maxParallelDownloads:**  
>Sets the maximum amount of downloads that can run concurrently. Default's to -1 which is unlimited, 2 would means only 2 videos downloaded at once.
>Note: Using this option can cause issues and is not strictly recommended.
>
>Default: "**-1**"  
>Example:
```json 
"maxParallelDownloads": -1
```

**downloadArtwork:**  
>Sets weather the script downloads album artwork images for each video. These are required for nice thumbnails in Plex.
>
>Default: "**true**"  
>Example:
```json 
"downloadArtwork": true
```

**artworkFormat:**  
>Sets the image format that artwork should be saved as.
>
>Default: "**"png"**"  
>Example:
```json 
"downloadArtwork": "png"
```

**formatWithEpisodes:**  
>If false will remove the SxxExx from the name of the videos. Will break Plex support!
>
>Default: "**true**"  
>Example:
```json 
"formatWithEpisodes": true
```

**formatWithDate:**  
>If true will add the date the video was published to the filename. This might break Plex ordering, so use at your own risk.
>
>Default: "**false**"  
>Example:
>"Linus Tech Tips - S01E1 - 2018-02-04 - SUPERCHARGE Your Super Nintendo!"
```json 
"formatWithDate": false
```

**formatWithSubChannel:**  
>If false will remove the subChannel name from the filename. Recommended to keep this true.
>
>Default: "**true**"  
>Example:
>"S01E1 - 2018-02-04 - SUPERCHARGE Your Super Nintendo!"
```json 
"formatWithSubChannel": false
```

**downloadUpdateTime:**  
>Sets the time in between download bar updates and saving of partial data to disk. A higher number will cause the script to write larger chunks of data to the disk, but will also mean recovering downloads can be further behind, this also effects the time the download bar updates. It is set in ms.
>
>Default: "**250**"  
>Example:
```json 
"downloadUpdateTime": 250
```

**ignoreFolderStructure:**  
>If true the script will save all videos directly into the videoFolder instead of organising into separate ones for each subChannel.
>
>Default: "**false**"  
>Example:
```json 
"ignoreFolderStructure": false
```

**yearsAsSeasons:**  
>If true the script will save all videos into a season folder based on the year they were released. This will cause Plex to show a season for each year.
>
>Default: "**false**"  
>Example:
>"\Videos\Linus Tech Tips\2017\VideoTitle.mp4"
```json 
"yearsAsSeasons": false
```

**monthsAsSeasons:**  
>If true the script will save all videos into a season folder based on the month+year they were released. This will cause Plex to show a season for each month.
>
>Default: "**false**"  
>Example:
>"\Videos\Linus Tech Tips\201701\VideoTitle.mp4" (If the month is January)
```json 
"monthsAsSeasons": false
```

**subscriptions:**  
>This contains all the Floatplane creators you are subscribed to and weather you want to download their videos. For Linus Media Group you can also set if you want to download their subChannels as well. Enabled sets if the primary channel is enabled, whereas ignore sets  if you want to ignore the sub-channels.
>Note: Using this with a maxVideos any lower than 30 will result in you missing videos!
>
>Default [Pre-First Run]:
```json
"subscriptions": {}
```
>**Example [Post-First Run] (Dont Download BitWit Ultra & Techquickie):**
```json 
"subscriptions": {
"5ae0f8114336369a2c3619b6": {
    {
      "id": "5ae0f8114336369a2c3619b6",
      "title": "Tech Deals",
      "enabled": true
    },
},
"59fa58f93acf6013471d5822": {
    {
      "id": "59fa58f93acf6013471d5822",
      "title": "BitWit Ultra",
      "enabled": false
    },
},
"59f94c0bdd241b70349eb72b": {
    {
      "id": "59f94c0bdd241b70349eb72b",
      "title": "Linus Tech Tips",
      "enabled": true,
      "ignore": {
        "Linus Tech Tips": false,
        "Channel Super Fun": false,
        "Floatplane Exclusive": false,
        "TechLinked": false,
        "TechQuickie": true
      }
    }
  ]
```

**repeatScript:**  
>This lets you have the script auto run at a specific interval. The default is false which disables this functionality, otherwise you can set it to the following format:
>xUnits, where x is a number, and Units is the type
>Types you can use are: s: Seconds, m: Minutes, h: Hours, d: Days, w: Weeks
>
>Default: "**false**"  
>Examples:  

Repeats every 2 minutes:
```json 
"repeatScript": "2m"
```
Repeats every hour:
```json 
"repeatScript": "1h"
```
Repeats every day:
```json 
"repeatScript": "1d"
```

**cookie:**  
>Variable used in the script to combine all the cookies for use. Ignore this.

**cookies:**  
>Each of these are used for authentication. You shouldnt modify these unless you know what your doing otherwise ignore this.
>
>Example: 
```json 
"cookies": {
    "__cfduid": "__cfduid=sd3fhjkfgdfsdfgh34jbvdfsdfsdf;",
    "sails.sid": "sails.sid=sdsdhjk1fgfsfghshj23khjhsdf;"
}
```

**ffmpeg:**  
>Enables ffmpeg processing of videos. Disabling this will break titles in Plex.
>
>Default: "**true**" 
>Example: 
```json 
"ffmpeg": false
```

**logging:**  
>Will log script events to a log file defined in the **logFile** setting.
>
>Default: "**false**" 
>Example: 
```json 
"logging": true
```

**logFile:**  
>Defines the file that will be used for logging if logging is enabled
>
>Default: "**./float.log**" 
>Example: 
```json 
"logFile": ./myLogFile.log
```

**remotePlex:**  
>This enables or disables remotely updating a Plex library in the script.  
>
>Default: "**false**"  
>Example:
```json 
"remotePlex": true
```

**remotePlexIP:**  
>This is the remote IP that the remote Plex server is hosted on.
>
>Default: ""  
>Example:
```json 
"remotePlexIP": 192.168.0.10
```

**remotePlexPort:**  
>This is the remote Port that the remote Plex server is hosted on. This only needs to be changed if your Plex server is not running on the default port of 32400
>
>Default: "32400"  
>Example:
```json 
"remotePlexPort": 32500
```

**PlexToken:**  
>This is the Plex token generated from your login details for updating remote servers. It is only needed for remote updates and can only be generated by running the script, which will prompt the user to enter their Plex username and password if PlexToken is empty and remotePlex is enabled.
>
>Default: ""  
>Example:
```json 
"remotePlexToken": "asSsdfH76FsNfer"
```

**localPlex:**  
>This enables or disables locally updating a Plex library in the script. Enabling this requires PlexSection and PlexScannerInstall to be set correctly.  
>
>Default: "**false**"  
>Example:
```json 
"localPlex": true
```

**PlexSection:**  
>This is the Plex section id your videos are stored in for auto updating the section when new videos are downloaded. 
If you are on windows you can find the Plex section your videos are in by running this command in CMD: ""C:\Program Files (x86)\Plex\Plex Media Server\Plex Media Scanner.exe" --list" And locating the section with the same name as you used for Floatplane videos on Plex.

As of v3.8.2 the script now can generate the section id from the url for the section as can be seen below: [![https://gyazo.com/df26f5bbb22fc5c70f2b8714a30ce54c](https://i.gyazo.com/df26f5bbb22fc5c70f2b8714a30ce54c.gif)](https://gyazo.com/df26f5bbb22fc5c70f2b8714a30ce54c)

The section is is the last number in the url.

You can also just enter the ID into the prompt the script gives, this prompt will only display if the section id is set to 0 which is the default.

>
>Default: "**0**"  
>Example:
```json 
"PlexSection": 5
```

**PlexScannerInstall:**  
>This only needs to be changed if Plex is not installed to the default path or if your on linux. This defines where the scanner program for updating Plex videos is located.
>
>Default: "**C:/Program Files (x86)/Plex/Plex Media Server/Plex Media Scanner.exe**"
>Example:
```json 
"PlexScannerInstall": "C:/Program Files (x86)/Plex/Plex Media Server/Plex Media Scanner.exe"
```

**autoFetchServer:**  
>When this is enabled the script will automatically fetch the download server for your region
>Disabling this will let you manually specify a download server in the **floatplaneServer** setting
>
>Default: "**true**"  
>Example:
```json 
"autoFetchServer": false
```

**floatplaneServer:**  
>This defines the server that the script will use to download, it could be useful to change this if your getting a slow download speed because of the region you are in. You can find what your default download server is by going to the LTT Forms>Floatplane>AnyVideo then right-click the download button and copy the url. That url should start with the server that floatplane gives you by default.
>You can see avalible edge servers by using this url: https://www.floatplane.com/api/edges
>
>Default: "**"https://Edge02-na.floatplaneclub.com:443"**" For NA there are two at the moment Edge01-na & Edge02-na
>Example:
```json 
"floatplaneServer": "https://Edge01-na.floatplaneclub.com:443"
```

**video_res:**  
>This defines the resolution to download the videos in. Currently there are only four options you can set it to:  
>**1080** (1080p), **720** (720p), **480** (480p), **360** (360p)
>
>Default: "**1080**"  
>Example:
```json 
"video_res": 1080
```

**user:**
>Stores your email/username for auto login. Can be deleted but only if cookies has values set.
>
>Can be manually set to your email/username by just typing it in.
>
>Default: ""  
>Examples:
```json 
"user": "Inrix"
OR
"user": "AEmail@Gmail.com"
```

**password:**  
>Stores your password for auto login. Can be deleted but only if cookies has values set.
>
>Can be manually set to your password by just typing it in.
>
>Default: ""  
>Example:
```json 
"password": "YourPasswordHere"
```
