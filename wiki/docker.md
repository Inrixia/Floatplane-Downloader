# Docker Wiki
### Tags:

- `:dev` - Image in sync with `dev` branch on github, **stable with latest features & fixes**
- `:latest` - Last release version of the downloader, usually stale & updated infrequently
  <br>

## Quickstart:
There is a interactive series of console prompts to help you setup the downloader and login. If you dont want to or cannot work with a interactive terminal please skip down to **Enviroment Variables**

Docker CLI:
```dockerfile
    $ docker run -it \
    	-v [path]:/fp/db \
    	-v [path]:/fp/videos \
    	-e runQuickstartPrompts=true \
    	--restart unless-stopped \
        inrix/floatplane-downloader:dev
```

- **[path]** should be replaced with a directory on your machine to hold persistent data.
- Setting the Quickstart environment variable to true will create an interactive terminal to walk you through setting up the downloader.

**After going through the Quickstart, run without quickstart prompts:**
```dockerfile
    $ docker run \
    	-v [path]:/fp/db \
    	-v [path]:/fp/videos \
    	-e headless="true" \
        --restart unless-stopped \
        inrix/floatplane-downloader:dev
```

## Settings
You can customize any settings by modifying the `settings.json` file that will be generated in the path you mounted the `/fp/db` folder to. For information on all settings please see **[Settings Wiki](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/settings.md)**

## Environment Variables:
You can also use enviroment variables to set any setting via **[Advanced Env Info](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/advenv.md)**

**For login:**
Docker CLI:
```dockerfile
    $ docker run \
    	-v [path]:/fp/db \
    	-v [path]:/fp/videos \
    	-e headless="true" \
    	--restart unless-stopped \
    	inrix/floatplane-downloader:dev
```

Docker-Compose:
```yaml
services:
  floatplane-downloader:
    image: inrix/floatplane-downloader:dev
    container_name: floatplane-downloader
    environment:
      - headless=true
      - token=Your2FactorCodeHere
    volumes:
      - [path]:/fp/db
      - [path]:/fp/videos
    restart: unless-stopped
```

### Including Plex
Docker CLI:
```dockerfile
    $ docker run \
    	-v [path]:/fp/db \
    	-v [path]:/fp/videos \
    	-e headless="true"
    	-e plexUsername="YourPlexUsernameHere" \
    	-e plexPassword="YourPlexPasswordHere2FactorCodeHereIfYouHaveOne" \
    	--restart unless-stopped \
    	inrix/floatplane-downloader:dev
```

Docker-Compose:
```yaml
services:
  floatplane-downloader:
    image: inrix/floatplane-downloader:dev
    container_name: floatplane-downloader
    environment:
      - headless=true
      - plexUsername=YourPlexUsernameHere
      - plexPassword=YourPexPasswordHere2FactorCodeHereIfYouHaveOne
    volumes:
      - [path]:/fp/db
      - [path]:/fp/videos
    restart: unless-stopped
```
