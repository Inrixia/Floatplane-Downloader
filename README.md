# Floatplane Club - PlexDownloader

![Plex Index](https://i.gyazo.com/83f1f94798659d1ce067cca7d2b814c5.png)
![Plex LTT](https://i.gyazo.com/cabe7fe239e86759bc5bedd74f633b9b.jpg)

### Basic Info:

**You can download the latest stable version from here: https://github.com/Inrixia/Floatplane-PlexDownloader/releases**

This is a Node.js script to download the daily videos from the [LMG Floatplane](https://linustechtips.com/main/store/) and format them to be viewed in [Plex](https://www.plex.tv/). You can also  view the raw files in the download folder.

This requires a **[Floatplane](https://linustechtips.com/main/store/)** subscription.

**For BitWit Ultra you need to enable it by setting this line to true in the settings:**  
[![https://gyazo.com/87c287a03d190ed5c863a5271c5e734e](https://i.gyazo.com/87c287a03d190ed5c863a5271c5e734e.png)](https://gyazo.com/87c287a03d190ed5c863a5271c5e734e)

### **Install Guide**

 * Make sure you have **[Node.js](https://nodejs.org/en/)** installed on your system to use this.
 * If you want to use **[Plex](https://www.plex.tv/)** to browse the files installed you must have it installed.
 * If you encounter any issues then feel free to create a issue here or just PM me on **[Discord](https://discordapp.com/) @Sir Inrix | <3#6950**.

#### Links:
 * [Installing the Script & Downloading](https://github.com/Inrixia/Floatplane-PlexDownloader/blob/master/wiki/script.md)
 * [Setting up Plex](https://github.com/Inrixia/Floatplane-PlexDownloader/blob/master/wiki/plex.md)
 * [Settings Info](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/settings.md)

I will be maintaining this as I use it.

If you want to open Plex files in your own Media Player eg, VLC, MPC-BE, WindowsMediaPlayer. Go and install this tampermonkey script here: **https://github.com/Kayomani/PlexExternalPlayer** **Important Note** for chrome users: https://github.com/Kayomani/PlexExternalPlayer/issues/16

If you want plex to update after downloading new videos (fixing the issue with some video titles not updating after being downloaded until you refresh metadata) you can add this code to the bottom of the Floatplane.bat file.

```"C:\Program Files (x86)\Plex\Plex Media Server\Plex Media Scanner.exe" --scan --refresh --force --section 20```

You need to replace the --section 10 with the section your Floatplane videos are in for Plex. You can find what section Floatplane is by using the command: ```"C:\Program Files (x86)\Plex\Plex Media Server\Plex Media Scanner.exe" --list```

**Note**: If anyone from LTT or Floatplane does not want me to have this publically avalible please just contact me and I will remove it.

---
## [More Screenshots](https://imgur.com/a/LdY1B)
