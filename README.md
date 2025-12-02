[![[dev] Release](https://github.com/Inrixia/Floatplane-Downloader/actions/workflows/releaseDev.yml/badge.svg)](https://github.com/Inrixia/Floatplane-Downloader/actions/workflows/releaseDev.yml) [![[master] Release](https://github.com/Inrixia/Floatplane-Downloader/actions/workflows/releaseMaster.yml/badge.svg?branch=master)](https://github.com/Inrixia/Floatplane-Downloader/actions/workflows/releaseMaster.yml)<br>

### **[Live Downloader Metrics Dashboard](https://monitor.hug.rip/public-dashboards/db0aec66747b4950b01b128916eb737e)**

![Active Downloaders](<https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fprometheus.hug.rip%2Fapi%2Fv1%2Fquery%3Fquery%3Dcount(instance)&query=data.result%5B0%5D.value%5B1%5D&label=Active%20Downloaders&color=rgb(115%2C%20191%2C%20105)>) ![Queued Videos](<https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fprometheus.hug.rip%2Fapi%2Fv1%2Fquery%3Fquery%3Dsum(queued)&query=data.result%5B0%5D.value%5B1%5D&label=Queued%20Videos&color=rgb(255%2C%20152%2C%2048)>)

![image](https://user-images.githubusercontent.com/6373693/115112327-2b69b680-9fd9-11eb-8239-45b30219f705.png)<br>
**This project is unofficial and not in any way affiliated with LMG**<br>
**Join our discord! [discord.gg/aNTyMME](https://discord.gg/aNTyMME)**
<br>

**Floatplane Downloader** Automagically downloads the latest videos from [Floatplane](https://floatplane.com) and optionally formats them to be viewed in [Plex](https://www.plex.tv/).

Both downloading videos as they release and archiving the entire backlog is supported!<br>
This requires a **[Floatplane](http://floatplane.com)** subscription.<br>

<br><br>
Thank you to everyone who has contributed to the project, you can see these amazing people on the right **>>**<br>
If you like the project, and want to support me can to throw some bits at my [Sponsor Page](https://github.com/sponsors/Inrixia) ❤️
<br>

If you encounter any issues please **[create a issue](https://github.com/Inrixia/Floatplane-Downloader/issues/new)**. Feel free to also ping me on our **[Discord](https://discord.gg/aNTyMME)**
<br>

If you want to **contribute** please work on the `dev` branch and not `master` for pull requests

# Install Guide

Looking for **Docker**?<br>
Get the image on: **[hub.docker.com/r/inrix/floatplane-downloader](https://hub.docker.com/r/inrix/floatplane-downloader)** and see instructions at **[the wiki](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/docker.md)**!

Looking for **Unraid**?<br>
Go install it using the unraid template! [**unraid template**](https://unraid.net/community/apps?q=floatplane#r)!

1. Download the latest binary for your OS from **[Releases](https://github.com/Inrixia/Floatplane-PlexDownloader/releases)**<br>

2. Run the binary and follow the setup prompts.<br>

3. **Profit?!**:<br>

At this point you should be completely set-up and ready to go!  
To start the downloader in the future all you need to do is run the binary.

For further customization please read the **[Settings Wiki](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/settings.md)**

If you want to setup plex please follow the guide in the Wikis:

# Wikis:

- [Setting up Plex](https://github.com/Inrixia/Floatplane-PlexDownloader/blob/master/wiki/plex.md)
- [Docker Info](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/docker.md)
- [Advanced Env Info](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/advenv.md)

**Note**: This is licenced under the GNU Affero General Public License v3.0. I am happy for you to use/modify/contribute to the source code as long as you provide a link back to here.
<br>

## Images:

### **[Grafana Dashboard](https://monitor.hug.rip/public-dashboards/db0aec66747b4950b01b128916eb737e) ([Template](https://github.com/Inrixia/Floatplane-Downloader/blob/dev/wiki/grafana.json))**

![image](https://github.com/Inrixia/Floatplane-Downloader/assets/6373693/825038d9-ecd4-437a-bd54-74476415c430)

## Downloader

![image](https://user-images.githubusercontent.com/6373693/115110440-8d252300-9fcf-11eb-92a0-a813fcfcc632.png)

## Plex

![image](https://user-images.githubusercontent.com/6373693/115112389-69ff7100-9fd9-11eb-92e2-b83c3241627b.png)
![image](https://user-images.githubusercontent.com/6373693/115112394-6e2b8e80-9fd9-11eb-9c3d-ecaa3f87eb16.png)
