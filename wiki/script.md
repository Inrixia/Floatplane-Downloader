# Script Install Guide
---
Make sure you have **[Node.js](https://nodejs.org/en/)** installed on your system.

**You can download the latest version from here: https://github.com/Inrixia/Floatplane-PlexDownloader/releases**

1. **Download the script:**

   >Make sure to extract the files on the drive you want the videos saved to. Or you can syslink the videos folder to the drive you want.

[![https://gyazo.com/4f3ada2e159372f9495776f956679e97](https://i.gyazo.com/4f3ada2e159372f9495776f956679e97.gif)](https://gyazo.com/4f3ada2e159372f9495776f956679e97)
[![https://gyazo.com/05b588462d6243664cb15a4f0ffb8ec1](https://i.gyazo.com/05b588462d6243664cb15a4f0ffb8ec1.gif)](https://gyazo.com/05b588462d6243664cb15a4f0ffb8ec1)

2. **Install Node.js packages:**

   >You can just copy paste this command into console or powershell to install the packages. Make sure you are in the directory the script is in though! (To paste in console rightclick)
   >
   >**npm install request  cheerio request-progress sanitize-filename fluent-ffmpeg glob mv fs**

[![https://gyazo.com/62be2c518b09f39d8b73157790605430](https://i.gyazo.com/62be2c518b09f39d8b73157790605430.gif)](https://gyazo.com/62be2c518b09f39d8b73157790605430)

3. **Install [ffmpeg](ffmpeg.org) (If not running Windows):**

   >In order to set the title's of videos for Plex you need ffmpeg installed. 
   >
   >If you are running windows you dont need to install it its bundled with the script, however if you are using another OS or want to use a different version of ffmpeg then you need to change the reference inside the script. 
   >
   >You can download ffmpeg from: **ffmpeg.org**

[![https://gyazo.com/16309a2e47e70755c26ccfb4d2bbbff1](https://i.gyazo.com/16309a2e47e70755c26ccfb4d2bbbff1.png)](https://gyazo.com/16309a2e47e70755c26ccfb4d2bbbff1)

4. **Set your cookies:**

   >**Important Note: You may need to update the cookies in the script occasionally. Especially if you get something that looks like this! Where it does not output if any videos are downloaded.**
   >
   >**But before you do to go update them, try just opening your browser to the LTT forms first. Usually that fixes it.**
   >[![https://gyazo.com/2f52b95875961a7fac33eae0a361ba54](https://i.gyazo.com/2f52b95875961a7fac33eae0a361ba54.png)](https://gyazo.com/2f52b95875961a7fac33eae0a361ba54)

   >This script does not login for you on floatplane. It requires cookies from a browser that has logged on (Though I may change this in the future for better support on servers).
   >
   >For the script to work you need to login to the LTT fourms preferably with keep me logged in checked and then inspect a Floatplane form post page.
   >
   >  Copy the cookie's into the script as can be seen below. You may also need to open the Fourms in the browser you used to log in occasionally before running the script.

[![https://gyazo.com/9f4b227d3070875002c553aedd3a0e45](https://i.gyazo.com/9f4b227d3070875002c553aedd3a0e45.gif)](https://gyazo.com/9f4b227d3070875002c553aedd3a0e45)
Go to the Application TAB. (This is on Chrome)
[![https://gyazo.com/59c413af93a86b3dc9e46647b508e17f](https://i.gyazo.com/59c413af93a86b3dc9e46647b508e17f.png)](https://gyazo.com/59c413af93a86b3dc9e46647b508e17f)
Copy the blurred out values from above into the highlighted line below:
[![https://gyazo.com/9932675c5a51df85cad723410066b4a8](https://i.gyazo.com/9932675c5a51df85cad723410066b4a8.png)](https://gyazo.com/9932675c5a51df85cad723410066b4a8)

4. **Profit?:**

   >At this point you should be completely setup and ready to go!
   >
   >To start the script all you need to do is run the run.bat file.
   >
   >If you want to start the script from console yourself, just use "node scrape.js"

The script will download the videos into the videos folder along with their thumbnails. If you want to setup Plex, read the guide here: **[Plex Guide](https://github.com/Inrixia/Floatplane-PlexDownloader/blob/master/wiki/plex.md)**
