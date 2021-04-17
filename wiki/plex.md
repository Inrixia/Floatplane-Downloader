# Plex Library Setup Guide
This assumes you have a **[Plex](https://www.plex.tv/)** sever.

## Create a Library:
Create a plex library (**TV Series**) for Floatplane and set these settings for it:<br>
**Make sure you also add the root folder the downloader is saving videos in to the library so it can find videos**
![https://gyazo.com/4ea679c43fb978135b021a57c7cd39d4](https://i.gyazo.com/4ea679c43fb978135b021a57c7cd39d4.png)

###  Posters:
There is a collection of posters you can download, you can find them **[Here](https://github.com/Inrixia/Floatplane-Downloader/tree/master/artwork)**.<br>
Use these to set the artwork for each channel in plex if you dont want it to be blank.
![image](https://user-images.githubusercontent.com/6373693/115113172-142cc800-9fdd-11eb-985a-c5a21bde48b0.png)

### Enable Library Refresh
If you want plex to automatically update as soon as new videos are downloaded you can add your Floatplane library to the plex section of your settings.json...<br>
The easiest way to do this is by setting `runQuickStartPrompts` to **true** and following the prompts to login and setup plex library refreshing.<br>
![image](https://user-images.githubusercontent.com/6373693/115113288-b187fc00-9fdd-11eb-8984-99bf6509a671.png)<br>
<br>
If however you want to manually configure it directly in your settings you should end up with something like this:<br>
![image](https://user-images.githubusercontent.com/6373693/115113268-9ae1a500-9fdd-11eb-8a0d-03a63e74eece.png)<br>
More details can be found on the specific settings at the **[Settings Wiki](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/settings.md)**

### Optional Plex Addon (Open Folder/Play in MediaPlayer):

If you dont want to watch the Floatplane content in the plex player and just want to use it for browsing the library. Then you can install **[This Awesome Script](https://github.com/Kayomani/PlexExternalPlayer)** to let you open the folder media is in and auto play plex files in your default media player.

More info on its install is  at the above link.<br>
**Important Note** for chrome users: https://github.com/Kayomani/PlexExternalPlayer/issues/16
