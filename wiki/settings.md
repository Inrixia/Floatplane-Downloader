# settings.json Info
---
This covers what each setting is and what you can change it to.  
[![https://gyazo.com/e834bffb26cb135151a62677def04c79](https://i.gyazo.com/e834bffb26cb135151a62677def04c79.png)](https://gyazo.com/e834bffb26cb135151a62677def04c79)

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
