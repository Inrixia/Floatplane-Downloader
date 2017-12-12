# Script Install Guide
---
Make sure you have **[Node.js](https://nodejs.org/en/)** installed on your system.

**You can download the latest stable version from here: https://github.com/Inrixia/Floatplane-PlexDownloader/releases**

1. **Download the script:**

   >Make sure to extract the files on the drive you want the videos saved to. Or you can syslink the videos folder to the drive you want.
   
**When getting the latest release [Stable] do this:**
[![https://gyazo.com/f70dbb1137f20fe4ca983235c442d29d](https://i.gyazo.com/f70dbb1137f20fe4ca983235c442d29d.gif)](https://gyazo.com/f70dbb1137f20fe4ca983235c442d29d)

**When getting the latest non-release version do this (Not Recommended!):**
[![https://gyazo.com/4f3ada2e159372f9495776f956679e97](https://i.gyazo.com/4f3ada2e159372f9495776f956679e97.gif)](https://gyazo.com/4f3ada2e159372f9495776f956679e97)
[![https://gyazo.com/05b588462d6243664cb15a4f0ffb8ec1](https://i.gyazo.com/05b588462d6243664cb15a4f0ffb8ec1.gif)](https://gyazo.com/05b588462d6243664cb15a4f0ffb8ec1)

2. **Install Node.js packages:**

   >You can just copy paste this command into console or powershell to install the packages. Make sure you are in the directory the script is in though! (To paste in console rightclick), Note this might take a while... Just let it load.
   >
   >**npm install**

[![https://gyazo.com/1988bad700edbc088895411916597558](https://i.gyazo.com/1988bad700edbc088895411916597558.gif)](https://gyazo.com/1988bad700edbc088895411916597558)

3. **Install [ffmpeg](ffmpeg.org) (If not running Windows):**

   >In order to set the title's of videos for Plex you need ffmpeg installed.
   >
   >If you are running windows you dont need to install it its bundled with the script, however if you are using another OS or want to use a different version of ffmpeg then you need to change the reference inside the script.
   >
   >You can download ffmpeg from: **ffmpeg.org**

[![https://gyazo.com/14763d29ff7ce685022de27304935276](https://i.gyazo.com/14763d29ff7ce685022de27304935276.png)](https://gyazo.com/14763d29ff7ce685022de27304935276)

4. **Login:**
   >**To use the script you need to login, you can do this two ways.**
   >**Login when the script asks you to:**
   [![https://gyazo.com/cb5611552b9e5dcf5a11ed5a40f13a6f](https://i.gyazo.com/cb5611552b9e5dcf5a11ed5a40f13a6f.png)](https://gyazo.com/cb5611552b9e5dcf5a11ed5a40f13a6f)
   >
   >Note this stores your username and password in plaintext in settings.json. However you can manually delete them from settings.json, and the script will only ask you to log back in if your session stored in the settings expires.
   >
   >**Or manually set them yourself which is noted below.**
   >
   >**Note, if you dont login with a username/password or use 2Factor you may need to do this.**
5. **Manually set your cookies [OPTIONAL]:**

   >You need to login to the LTT fourms preferably with keep me logged in checked and then inspect a Floatplane form post page.
   >
   >Copy the cookie's into the settings.json as can be seen below.

[![https://gyazo.com/9f4b227d3070875002c553aedd3a0e45](https://i.gyazo.com/9f4b227d3070875002c553aedd3a0e45.gif)](https://gyazo.com/9f4b227d3070875002c553aedd3a0e45)
Go to the Application TAB. (This is on Chrome)
[![https://gyazo.com/59c413af93a86b3dc9e46647b508e17f](https://i.gyazo.com/59c413af93a86b3dc9e46647b508e17f.png)](https://gyazo.com/59c413af93a86b3dc9e46647b508e17f)
Copy your ips4 cookies seen above into the highlighted line below:

[![https://gyazo.com/1d25bc4b3f2bf73c443ddbdc533942e2](https://i.gyazo.com/1d25bc4b3f2bf73c443ddbdc533942e2.png)](https://gyazo.com/1d25bc4b3f2bf73c443ddbdc533942e2)

If you want to change any other settings, you can do so now inside the settings.json file. More info on settings can be found here: **[Settings Guide](https://github.com/Inrixia/Floatplane-PlexDownloader/blob/master/wiki/settings.md)**

6. **Profit?:**

   >At this point you should be completely setup and ready to go!
   >
   >To start the script all you need to do is run the Floatplane.bat file.
   >
   >If you want to start the script from console yourself, just use "node scrape.js"

The script will download the videos into the videos folder along with their thumbnails. If you want to setup Plex, read the guide here: **[Plex Guide](https://github.com/Inrixia/Floatplane-PlexDownloader/blob/master/wiki/plex.md)**
