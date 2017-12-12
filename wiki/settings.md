# settings.json Info
---
This covers what each setting is and what you can change it to.  
[![https://gyazo.com/e834bffb26cb135151a62677def04c79](https://i.gyazo.com/e834bffb26cb135151a62677def04c79.png)](https://gyazo.com/e834bffb26cb135151a62677def04c79)

**videoFolder:**

>This sets the folder the videos are downloaded to. It can be related to the scripts folder through "./" or a full system path like "C:/Users/Inrix/Downloads".
>
>Default: "**./videos/**"

**useFloatplane:**  
>Defines wether or not do download **Linus Media Group** videos true to download, false to not.
>
>Default: "**true**"

**useBitWit:**  
>Defines wether or not do download **BitWit** videos true to download, false to not.
>
>Default: "**false**"

**maxVideos:**  
>States how far down the latest video posts the script should look in number of posts. 30 Is the maximum posts per page you can set it to anything below this.
>
>Note: This does not effect script performance, its only there if you only wanted to download a single video without downloading old ones.
>
>Default: "**30**"

**cookie:**  
>Variable used in the script to combine all the cookies for use. Ignore this.

**cookies:**  
>Each of these are used for authentication. You shouldnt modify these unless you are manually entering your cookies otherwise Ignore this.

**video_res:**  
>This defines the resoloution to download the videos in. Currently there are only four options you can set it to:  
>**1080** (1080p), **720** (720p), **480** (480p), **360** (360p)
>
>Default: "**1080**" 

**user:**
>Stores your email/username for auto login. Can be deleted but only if cookies has values set.
>
>Can be manually set to your email/username by just typing it in.
>
>Default: ""

**password:**  
>Stores your password for auto login. Can be deleted but only if cookies has values set.
>
>Can be manually set to your password by just typing it in.
>
>Default: ""

**csrfKey:**  
>Variable used in the script for getting session info. Ignore this.
