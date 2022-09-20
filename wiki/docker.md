# Docker Wiki

### Tags:

- `:latest`
  - Latest release version of the downloader
- `:dev` - Image in sync with `dev` branch on github, bleeding edge changes that **will likely break everything**.
  <br>

## Quickstart:

There is a interactive series of console prompts to help you setup the downloader and login. If you dont want to or cannot work with a interactive terminal please skip down to **Enviroment Variables**

Docker CLI:
```dockerfile
    $ docker run -it \
    	-v [path]:/fp/db \
    	-v [path]:/fp/videos \
    	-e headless="true" \
    	-e runQuickstartPrompts=true \
    	--restart unless-stopped \
        inrix/floatplane-downloader
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
        inrix/floatplane-downloader
```

<br>

## Environment Variables:

Setting environment variables allows you to pass in your login details, removing the need to use the quickstart prompts to login/setup the downloader.

**For login:**

Docker CLI:
```dockerfile
    $ docker run \
    	-v [path]:/fp/db \
    	-v [path]:/fp/videos \
    	-e headless="true" \
    	-e username="YourUsernameHere" \
    	-e password="YourPasswordHere" \
    	-e token="Your2FactorCodeHere" \
    	--restart unless-stopped \
    	inrix/floatplane-downloader
```

Docker-Compose:
```yaml
version: "3.8"
services:
  floatplane-downloader:
    image: inrix/floatplane-downloader
    container_name: floatplane-downloader
    environment:
      - headless="true"
      - username="YourUsernameHere"
      - password="YourPasswordHere"
      - token="Your2FactorCodeHere"
    volumes:
      - [path]:/fp/db
      - [path]:/fp/videos
    restart: unless-stopped
```

**For login + plex:**

Docker CLI:
```dockerfile
    $ docker run \
    	-v [path]:/fp/db \
    	-v [path]:/fp/videos \
    	-e headless="true"
    	-e username="YourUsernameHere" \
    	-e password="YourPasswordHere" \
    	-e plexUsername="YourPlexUsernameHere" \
    	-e plexPassword="YourPexPasswordHere2FactorCodeHereIfYouHaveOne" \
    	--restart unless-stopped \
    	inrix/floatplane-downloader
```

Docker-Compose:
```yaml
version: "3.8"
services:
  floatplane-downloader:
    image: inrix/floatplane-downloader
    container_name: floatplane-downloader
    environment:
      - headless="true"
      - username="YourUsernameHere"
      - password="YourPasswordHere"
      - plexUsername="YourPlexUsernameHere"
      - plexPassword="YourPexPasswordHere2FactorCodeHereIfYouHaveOne"
    volumes:
      - [path]:/fp/db
      - [path]:/fp/videos
    restart: unless-stopped
```

You can also use enviroment variables to set any config values which will be persisted.<br>
For more info on advanced environment variables, please see **[Advanced Env Info](https://github.com/Inrixia/Floatplane-Downloader/blob/master/wiki/advenv.md)**
