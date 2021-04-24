# Floatplane Downloader

**This project is unofficial and not in any way affiliated with LMG**<br>
**Join our discord! [discord.gg/aNTyMME](https://discord.gg/aNTyMME)**
<br>

**Floatplane Downloader** Automagically downloads the latest videos from [Floatplane](https://floatplane.com) and optionally formats them to be viewed in [Plex](https://www.plex.tv/).<br>
<br>
Both downloading videos as they release and archiving the entire backlog is supported!<br>
This requires a **[Floatplane](http://floatplane.com)** subscription.
<br>

If you like the project, and want to support me can to throw some bits at my [PayPal](https://www.paypal.com/donate?business=XZX2VLBCVA766&currency_code=NZD) <3

### Tags:
- `:latest`
	- Latest release version of the downloader
- `:beta`
	- WIP version used for testing, may be completely broken...
<br>

## Quickstart:
There is a interactive series of console prompts to help you setup the downloader and login. If you dont want to or cannot work with a interactive terminal please skip down to **Enviroment Variables**

    $ docker run -it \
		-v [path]:/fp/db \
		-v [path]:/fp/videos \
		-e headless="true" \
		-e runQuickstartPrompts=true \
	    inrix/floatplane-downloader

- **[path]** should be replaced with a directory on your machine to hold persistent data.
- Setting the Quickstart environment variable to true will create an interactive terminal to walk you through setting up the downloader.

**After going through the Quickstart, run without quickstart prompts:**

    $ docker run \
		-v [path]:/fp/db \
		-v [path]:/fp/videos \
		-e headless="true" \
	    inrixia/floatplane-downloader
<br>

## Environment Variables:
Setting environment variables allows you to pass in your login details, removing the need to use the quickstart prompts to login/setup the downloader.

**For login:**

    $ docker run \
		-v [path]:/fp/db \
		-v [path]:/fp/videos \
		-e headless="true" \
		-e username="YourUsernameHere" \
		-e password="YourPasswordHere" \
		-e token="Your2FactorCodeHere" \
		inrix/floatplane-downloader

**For login + plex:**

    $ docker run \
		-v [path]:/fp/db \
		-v [path]:/fp/videos \
		-e headless="true"
		-e username="YourUsernameHere" \
		-e password="YourPasswordHere" \
		-e plexUsername="YourPlexUsernameHere" \
		-e plexPassword="YourPexPasswordHere2FactorCodeHereIfYouHaveOne" \
		inrix/floatplane-downloader

You can also use enviroment variables to overwrite/set config values, though the config is persisted under db/config.json.<br>
To do this you must take the key for the setting in the settings.json and write it with the dots **.** replaced with underscores **_** you can see an example for the setting `floatplane.videoResolution` below:

**For settings:**

    $ docker run \
		-v [path]:/fp/db \
		-v [path]:/fp/videos \
		-e headless="true" \
		-e floatplane_videoResolution="1080" \
		-e plex_token="ThisRemovesTheNeedForPassingUsername/Password" \
		inrix/floatplane-downloader