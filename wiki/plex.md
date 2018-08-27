# Plex Library Setup Guide
---
Make sure you have **[Plex](https://www.plex.tv/)** installed on your system.

Note: This is not how to install and set-up Plex, this is only how to set-up the LTT Library.
Note: This only shows how to do this for LinusMediaGroup, for other channels just repeat the same steps for that channel.

1. **Create a Library:**

   >Create the plex library (TV Series) for Floatplane and set these settings for it:

[![https://gyazo.com/678c6e547a7620fe2c7e95234368374a](https://i.gyazo.com/678c6e547a7620fe2c7e95234368374a.gif)](https://gyazo.com/678c6e547a7620fe2c7e95234368374a)
[![https://gyazo.com/a45b1955e1eb92fcede4085f96663321](https://i.gyazo.com/a45b1955e1eb92fcede4085f96663321.gif)](https://gyazo.com/a45b1955e1eb92fcede4085f96663321)

Make sure you have Preview Thumbnails unticked or it wont use the proper thumbnails for each video.
[![https://gyazo.com/4ea679c43fb978135b021a57c7cd39d4](https://i.gyazo.com/4ea679c43fb978135b021a57c7cd39d4.png)](https://gyazo.com/4ea679c43fb978135b021a57c7cd39d4)

2. **Set the posters for each "Series":**

   >This is pretty self explanatory, the artwork for each LMG channel is in the videos folder under artwork.

[![https://gyazo.com/9a427387f9249b201983bfb080ad1a38](https://i.gyazo.com/9a427387f9249b201983bfb080ad1a38.gif)](https://gyazo.com/9a427387f9249b201983bfb080ad1a38)

3. **Fix "Season 1" to show "LTT" or "TQ" etc, (Optional):**

   **Note: This is pointless if you are using the settings "yearsAsSeasons": true, or "monthsAsSeasons": true, as with these the season will be the Year/Year+Month.**

   >Each LMG channel is listed as a Series with one season. Though we hid the seasons so that we can just go straight to the videos. However when looking at a "episode" plex will display this up the top:
   >[![https://gyazo.com/8b4513ea88e842581bf0b81586e9426d](https://i.gyazo.com/8b4513ea88e842581bf0b81586e9426d.png)](https://gyazo.com/8b4513ea88e842581bf0b81586e9426d)

   >To fix this you just need to rename the season using a sneaky trick.

First enable seasons again
[![https://gyazo.com/178aeec11f3c9cc08d1c4366d7b75569](https://i.gyazo.com/178aeec11f3c9cc08d1c4366d7b75569.gif)](https://gyazo.com/178aeec11f3c9cc08d1c4366d7b75569)

Then inspect the summary element and insert the below code into the HTML re **[This Form Post](https://forums.plex.tv/discussion/52721/tip-a-quick-hack-to-rename-seasons#top)**
```html
<input name="title" value="title goes here" />
```
[![https://gyazo.com/18c9f952f37e6c3f3c40c5c42e4016f7](https://i.gyazo.com/18c9f952f37e6c3f3c40c5c42e4016f7.gif)](https://gyazo.com/18c9f952f37e6c3f3c40c5c42e4016f7)

And rename the Season to whatever you want. In this case this is the Linus Tech Tips series so im naming it LTT.
[![https://gyazo.com/a913578c6bbfcdbfdf41a8c8683f0af3](https://i.gyazo.com/a913578c6bbfcdbfdf41a8c8683f0af3.gif)](https://gyazo.com/a913578c6bbfcdbfdf41a8c8683f0af3)

Tadaa Fixed!

[![https://gyazo.com/9c55c77bdebd898d13980fc8adb4a043](https://i.gyazo.com/9c55c77bdebd898d13980fc8adb4a043.png)](https://gyazo.com/9c55c77bdebd898d13980fc8adb4a043)


4. **Optional Plex Addon (Open Folder/Play in MediaPlayer):**

   >If you dont want to watch the Floatplane content in the plex player and just want to use it for browsing the library. Then you can install **[This Awesome Script](https://github.com/Kayomani/PlexExternalPlayer)** to let you open the folder media is in and auto play plex files in  your default media player.
   >
   >More info on  its install is  at the above link.
   >
   >**Important Note** for chrome users: https://github.com/Kayomani/PlexExternalPlayer/issues/16

[![https://gyazo.com/5aa59889ac25f5f54c6790af9ed32c15](https://i.gyazo.com/5aa59889ac25f5f54c6790af9ed32c15.gif)](https://gyazo.com/5aa59889ac25f5f54c6790af9ed32c15)
