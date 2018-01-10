# Script Install Guide
---
Make sure you have **[Node.js](https://nodejs.org/en/)** installed on your system.

**There is now a auto installer! You can download and run it here: [Install.zip](https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/releases/Install.zip)**

To install using the **[Install.zip](https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/releases/Install.zip)**, make sure you have Node.js installed, download the **[Install.zip](https://raw.githubusercontent.com/Inrixia/Floatplane-Downloader/master/releases/Install.zip)** unzip it into the folder you want the script in and run install.bat. **Then skip to part 3 of this guide**.

**Note:** The Install and Update scripts will always install the newest version. If you want to install a older version you must do so manually.

To install manually continue to read below.

**You can download the latest stable version from here: https://github.com/Inrixia/Floatplane-PlexDownloader/releases**

1. **Download the script:**

   >Make sure to extract the files on the drive you want the videos saved to. Or you can syslink the videos folder to the drive you want. You can now also change the video folder directory in the settings.json file, make sure to copy the folders inside the videos folder over though!
   
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
   >If you are running windows you dont need to install it its bundled with the script, however if you are using another OS or want to use a different version of ffmpeg then you need to change the reference inside the script.
   >
   >You can download ffmpeg from: **ffmpeg.org**

[![https://gyazo.com/14763d29ff7ce685022de27304935276](https://i.gyazo.com/14763d29ff7ce685022de27304935276.png)](https://gyazo.com/14763d29ff7ce685022de27304935276)

4. **Login:**
   >**To use the script you need to login, you can do this two ways.**
   >**Login when the script asks you to using either your email or username:**  
   [![https://gyazo.com/338c4ab48e21da63a512394ff08ca413](https://i.gyazo.com/338c4ab48e21da63a512394ff08ca413.png)](https://gyazo.com/338c4ab48e21da63a512394ff08ca413)
   >
   >Note this stores your username and password in plaintext in settings.json. However you can manually delete them from settings.json, and the script will only ask you to log back in if your session stored in the settings expires.
   >
   >**Or manually set them yourself which is noted below.**  
   >**If you dont login with a username/email & password or use 2Factor you may need to do this.**
5. **Manually set your cookies [OPTIONAL]:**

   >You need to login to the LTT fourms preferably with keep me logged in checked and then inspect a Floatplane form post page.  
   >
   >**Open a page on the LTT forms after logging in and rightclick-inspect.**  
[![https://gyazo.com/9f4b227d3070875002c553aedd3a0e45](https://i.gyazo.com/9f4b227d3070875002c553aedd3a0e45.gif)](https://gyazo.com/9f4b227d3070875002c553aedd3a0e45)
**Go to the Application TAB. (This is on Chrome)**
[![https://gyazo.com/59c413af93a86b3dc9e46647b508e17f](https://i.gyazo.com/59c413af93a86b3dc9e46647b508e17f.png)](https://gyazo.com/59c413af93a86b3dc9e46647b508e17f)
**Copy your ips4 cookies seen above into the settings cookies so it looks like this:**  
[![https://gyazo.com/bcb242eb53622cdf642d310f18db3e78](https://i.gyazo.com/bcb242eb53622cdf642d310f18db3e78.png)](https://gyazo.com/bcb242eb53622cdf642d310f18db3e78)

If you want to change any other settings, you can do so now inside the settings.json file. More info on settings can be found here: **[Settings Guide](https://github.com/Inrixia/Floatplane-PlexDownloader/blob/master/wiki/settings.md)**

6. **Plex Update:**

   If you want plex to update after downloading new videos (fixing the issue with some video titles not updating after being downloaded until you refresh metadata) you can add this code to the bottom of the **Floatplane.bat** file.

   ```"C:\Program Files (x86)\Plex\Plex Media Server\Plex Media Scanner.exe" --scan --refresh --force --section 20```

   You need to replace the **--section 10** with the section your Floatplane videos are in for Plex. You can find what section Floatplane is by using the command: ```"C:\Program Files (x86)\Plex\Plex Media Server\Plex Media Scanner.exe" --list```

7. **Profit?:**

   At this point you should be completely setup and ready to go!  
   To start the script all you need to do is run the **Floatplane.bat** file.  
   If you want to start the script from console yourself, just use "**node scrape.js**"  

The script will download the videos into the videos folder along with their thumbnails. If you want to setup Plex, read the guide here: **[Plex Guide](https://github.com/Inrixia/Floatplane-PlexDownloader/blob/master/wiki/plex.md)**
