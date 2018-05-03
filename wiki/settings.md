# settings.json Info
---
This covers what each setting is and what you can change it to. 

Note that "max" type settings apply seperately to each channel, so maxVideos set to 4 means 4 videos for Floatplane and BitWit Ultra, if you have both enabled.
[![https://gyazo.com/b33b198af7ea1bd2c07e58af973e12c2](https://i.gyazo.com/b33b198af7ea1bd2c07e58af973e12c2.png)](https://gyazo.com/b33b198af7ea1bd2c07e58af973e12c2)

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

**useFloatplane:**  
>Defines wether or not do download **Linus Media Group** videos true to download, false to not.
>
>Default: "**true**"  
>Example:
```json 
"useFloatplane": true
```

**useBitWit:**  
>Defines wether or not do download **BitWit** videos true to download, false to not.
>
>Default: "**false**"  
>Example:
```json 
"useBitWit": false
```

**maxVideos:**  
>States how far down the latest video posts the script should look in number of posts. 30 Is the maximum posts per page you can set it to anything below this.
>
>Note: This does not effect script performance, its only there if you only wanted to download a single video without downloading old ones.
>
>Default: "**30**"  
>Example:
```json 
"maxVideos": 30
```

**maxPages:**  
>States how many pages of posts to look through. Intended to be used once to download a large amount of videos. 1 is the default and should be set to this for normal operation.
>
>Default: "**1**"  
>Example:
```json 
"maxPages": 1
```

**maxParallelDownloads:**  
>Sets the maximum amount of downloads that can run cocurrently. Default's to -1 which is unlimited, 2 would means only 2 videos downloaded at once.
>Note: Using this option can cause issues and is not strictly reccomended.
>
>Default: "**-1**"  
>Example:
```json 
"maxParallelDownloads": -1
```

**downloadArtwork:**  
>Sets wether the script downloads album artwork images for each video. These are required for nice thumbnails in plex.
>
>Default: "**true**"  
>Example:
```json 
"downloadArtwork": true
```

**forceLogin:**  
>Forces the script to login every time. For if storing the session is causing errors. No longer really needed after v3.7.0
>
>Default: "**false**"  
>Example:
```json 
"forceLogin": false
```

**formatWithEpisodes:**  
>If false will remove the SxxExx from the name of the videos. Will break plex support!
>
>Default: "**true**"  
>Example:
```json 
"formatWithEpisodes": true
```

**formatWithDate:**  
>If true will add the date the video was published to the filename. This might break plex ordering, so use at your own risk.
>
>Default: "**false**"  
>Example:
>"Linus Tech Tips - S01E1 - 2018-02-04 - SUPERCHARGE Your Super Nintendo!"
```json 
"formatWithDate": false
```

**downloadUpdateTime:**  
>Sets the time inbetween download bar updates and saving of partial data to disk. A higher number will cause the script to write to the disk while downloading less, but will also mean recovering downloads can be further behind, this also effects the time the download bar updates. It is set in ms.
>
>Default: "**250**"  
>Example:
```json 
"downloadUpdateTime": 250
```

**ignoreFolderStructure:**  
>If true the script will save all videos directly into the videoFolder instead of organising into seperate ones for each subChannel.
>
>Default: "**false**"  
>Example:
```json 
"ignoreFolderStructure": false
```

**yearsAsSeasons:**  
>If true the script will save all videos into a season folder based on the year they were released. This will cause plex to show a season for each year.
>
>Default: "**false**"  
>Example:
>"\Videos\Linus Tech Tips\2017\VideoTitle.mp4"
```json 
"yearsAsSeasons": false
```

**monthsAsSeasons:**  
>If true the script will save all videos into a season folder based on the month+year they were released. This will cause plex to show a season for each month.
>
>Default: "**false**"  
>Example:
>"\Videos\Linus Tech Tips\201701\VideoTitle.mp4" (If the month is January)
```json 
"monthsAsSeasons": false
```


**subChannelIgnore:**  
>Contains a series of key value pairs that state what subChannels to not download. If a subChannel name has a value of true then all videos from that subChannel will not be downloaded.
>Note: Using this with a maxVideos any lower than 30 will result in you missing videos!
>
>Default:
```json
"subChannelIgnore": {
    "Floatplane Exclusive": false,
    "Linus Tech Tips": false,
    "Techquickie": false,
    "Channel Super Fun": false
}
```
>**Example (Dont download Techquickie videos):**
```json 
"subChannelIgnore": {
    "Floatplane Exclusive": false,
    "Linus Tech Tips": false,
    "Techquickie": true,
    "Channel Super Fun": false
}
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
>Each of these are used for authentication. You shouldnt modify these unless you are manually entering your cookies otherwise Ignore this.
>
>Example: 
```json 
"cookies": {
    "ips4_IPSSessionFront": "ips4_IPSSessionFront=sd3fhjkfgdfsdfgh34jbvdfsdfsdf;",
    "ips4_device_key": "ips4_device_key=sdsdhjk1fgfsfghshj23khjhsdf;",
    "ips4_member_id": "ips4_member_id=145544;",
    "ips4_login_key": "ips4_login_key=sdukhsdf56sdfjku4hfsdf6sdhjkhjkdf;"
}
```

**remotePlex:**  
>This enables or disables remotely updating a plex library in the script.  
>
>Default: "**false**"  
>Example:
```json 
"remotePlex": true
```

**remotePlexIP:**  
>This is the remote IP that the remote plex server is hosted on.
>
>Default: ""  
>Example:
```json 
"remotePlexIP": 192.168.0.10
```

**remotePlexPort:**  
>This is the remote Port that the remote plex server is hosted on. This only needs to be changed if your plex server is not running on the default port of 32400
>
>Default: "32400"  
>Example:
```json 
"remotePlexPort": 32500
```

**plexToken:**  
>This is the plex token generated from your login details for updating remote servers. It is only needed for remote updates and can only be generated by running the script, which will prompt the user to enter their plex username and password if plexToken is empty and remotePlex is enabled.
>
>Default: ""  
>Example:
```json 
"remotePlexToken": "asSsdfH76FsNfer"
```

**localPlex:**  
>This enables or disables locally updating a plex library in the script. Enabling this requires plexSection and plexScannerInstall to be set correctly.  
>
>Default: "**false**"  
>Example:
```json 
"localPlex": true
```

**plexSection:**  
>This is the plex section id your videos are stored in for auto updating the secion when new videos are downloaded. 
If you are on windows you can find the plex section your videos are in by running this command in CMD: ""C:\Program Files (x86)\Plex\Plex Media Server\Plex Media Scanner.exe" --list" And locating the section with the same name as you used for Floatplane videos on plex.

As of v3.8.2 the script now can generate the section id from the url for the section as can be seen below: [![https://gyazo.com/df26f5bbb22fc5c70f2b8714a30ce54c](https://i.gyazo.com/df26f5bbb22fc5c70f2b8714a30ce54c.gif)](https://gyazo.com/df26f5bbb22fc5c70f2b8714a30ce54c)

The section is is the last number in the url.

You can also just enter the ID into the prompt the script gives, this prompt will only display if the section id is set to 0 which is the default.

>
>Default: "**0**"  
>Example:
```json 
"plexSection": 5
```

**plexScannerInstall:**  
>This only needs to be changed if plex is not installed to the default path or if your on linux. This defines where the scanner program for updating plex videos is located.
>
>Default: "**C:/Program Files (x86)/Plex/Plex Media Server/Plex Media Scanner.exe**"
>Example:
```json 
"plexScannerInstall": "C:/Program Files (x86)/Plex/Plex Media Server/Plex Media Scanner.exe"
```

**floatplaneServer:**  
>This defines the server that the script will use to download, it could be useful to change this if your getting a slow download speed because of the region you are in. You can find what your default download server is by going to the LTT Forms>Floatplane>AnyVideo then rightclick the download button and copy the url. That url should start with the server that floatplane gives you by default.
>
>Default: "**"https://Edge02-na.floatplaneclub.com:443"**" For NA there are two at the moment Edge01-na & Edge02-na
>Example:
```json 
"floatplaneServer": "https://Edge01-na.floatplaneclub.com:443"
```

**video_res:**  
>This defines the resoloution to download the videos in. Currently there are only four options you can set it to:  
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

**csrfKey:**  
>Variable used in the script for getting session info. Ignore this.
