# settings.json Info
---
This covers what each setting is and what you can change it to.  
[![https://gyazo.com/1e2a134c7780fb4f1ba84a62884477f4](https://i.gyazo.com/1e2a134c7780fb4f1ba84a62884477f4.png)](https://gyazo.com/1e2a134c7780fb4f1ba84a62884477f4)

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
"useBitWit": true
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
>Forces the script to login every time. For if storing the session is causing errors.
>
>Default: "**false**"  
>Example:
```json 
"forceLogin": true
```

**formatWithEpisodes:**  
>If false will remove the SxxExx from the name of the videos. Will break plex support!
>
>Default: "**true**"  
>Example:
```json 
"forceLogin": false
```

**downloadUpdateTime:**  
>Sets the time inbetween download bar updates and saving of partial data to disk. A lower rate may cause flickering on the download bars.
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
