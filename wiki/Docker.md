# Docker setup guide (OUTDATED): See the docker section of README
---

Make sure you have Docker installed, a complete guide on how to install Docker is on their [site](https://docs.docker.com/install/). 

---

### 1. Clone the repository

```
git clone https://github.com/Inrixia/Floatplane-Downloader.git
```
	
### 2. Edit the setting.json

This is explained in the other setup guide about the [settings.json](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/settings.md). You will need to enter the cookie or credentials (bottom of the guide and file). 

**Make sure to leave the videoFolder the same, you are able to change that later. Also make sure to turn repeatScript on.**

### 3. Build your docker image
	
To build your docker image, run the command below. Replace the `<tag-name>` with a name of your choosing. This way you will be able find your image more easily. 
	
**Before running this command, make sure you are in the root directory of the repository you just cloned**
	
```
docker build . <tag-name>
```
	
Docker will now get all the rescources it needs to build you image.
	
### 4. Running your container
	
Everything is now ready to start downloading the videos. Using the following command you will get your docker image up and running and it will automatically download all Plex files, but first you need to modify your command. First, let's start with the variables:

```
<tag-name>: You set this up at step 3, use it to let Docker know what image to search

<location>: The location on your hard-disk, where the repository is cloned.

<videoLocation>: The folder where you want to download all the videos to. 
```

Now for the actual command:

```
docker run -d \
-v <location>/Floatplane-Downloader/settings.json:/Floatplane-Downloader/settings.json \
-v <location>/Floatplane-Downloader/partial.json:/Floatplane-Downloader/partial.json \
-v <location>/Floatplane-Downloader/videos.json:/Floatplane-Downloader/videos.json \
-v <videoLocation>/Floatplane-Downloader/videos:/Floatplane-Downloader/videos \
--restart=always <tag-name>
```

If you run this command, docker will start a container in the background (`-d option`) and it will always restart, even when you restart the system (`-restart=always option`). You will be providing 2 files from your host to the container, these are the videos.json and the partial.json. **The script uses these to keep track of all the episodes, so make sure to not delete those. Otherwise it will start counting from 0 again.**

### 5. changing the settings (optional)

Imagine you are running the script for a few days and you want to keep a bigger archive so you want to chenge the settings.json. No problem, you can change the settings.json file in the repo you cloned. The file is being watched by your Docker container. For the changes to take effect you have to restart your container. 

#### 5.1. Finding your container

To find your container, run the following command

```
docker ps
```

This will show you all the running Docker containers on your system. Now find the container running your image (look for the image `<tag-name>`). Now remember the NAME that Docker has assigned to your container (`<container-name>`).

To restart your container, simply run the command 

```
docker restart <container-name>
```