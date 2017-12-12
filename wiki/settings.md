# settings.json Info
---
This just covers what each setting is and what you can change it to.

[![https://gyazo.com/1884dc350ebaa75964d509cd0c39cfa9](https://i.gyazo.com/1884dc350ebaa75964d509cd0c39cfa9.png)](https://gyazo.com/1884dc350ebaa75964d509cd0c39cfa9)

**videoFolder:**

>This sets the folder the videos are downloaded to. It can be related to the scripts folder through "./" or a full system path like "C:/Users/Inrix/Downloads".
>
>Default: "**./videos/**"

**useFloatplane:**

>Defines wether or not do download **Linus Media Group** videos. true to download, false to not.
>
>Default: "**true**"

**useBitWit:**

>Defines wether or not do download **BitWit** videos. true to download, false to not.
>
>Default: "**false**"

**maxVideos:**

>States how far down the latest video posts the script should look in number of posts. 30 Is the maximum posts per page.
>
>Note: This does not effect script performance, its only there if you only wanted to download a single video without downloading old ones.
>
>Default: "**30**"

**cookie:**

>Variable used in the script to combine all the cookies for use. Ignore this.

**cookies:**

>Each of these are used for authentication. You shouldnt modify these unless you are manually entering your cookies otherwise Ignore this.

**video_res:**

>This defines the resoloution to download the videos in. Currently there are only four options:
>
>**1080** (1080p), **720** (720p), **480** (480p), **360** (360p)
>
>Default: "**1080**"

**email:**

>Stores your email/username for auto login. Can be deleted but only if cookies has values set.
>
>Default: ""

**password:**

>Stores your password for auto login. Can be deleted but only if cookies has values set.
>
>Default: ""

**csrfKey:**

>Variable used in the script for getting session info. Ignore this.
