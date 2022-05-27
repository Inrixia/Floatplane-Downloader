# Advanced Env Setup

The downloader allows you to change settings in a variety of ways, directly via the `settings.json`, via arguments and via eniroment variables (.env file supported).

There are two ways you can use enviroment variables to set settings:

## Single Variable

To do this you must take the key for the setting in the `settings.json` and write it with the dots **.** replaced with underscores **\_** you can see an example for the setting `floatplane.videoResolution` below:

```dockerfile
    $ docker run \
    	-v [path]:/fp/db \
    	-v [path]:/fp/videos \
    	-e headless="true" \
    	-e floatplane_videoResolution="1080" \
    	-e plex_token="ThisRemovesTheNeedForPassingUsername/Password" \
    	--restart unless-stopped \
    	inrix/floatplane-downloader
```

or in a .env file:

```
headless=true
floatplane_videoResolution=1080
```

## JSON

If you want to have a more advanced configuration (ie spaces in variable names) then you can use **`__FPDSettings`** with JSON.
Here is an example of setting just the Floatplane Exclusive settings via `__FPDSettings` and `extras` via the single variable method:

```
extras_stripSubchannelPrefix=true
extras_downloadArtwork=true
extras_saveNfo=true
__FPDSettings="{
	subscriptions: {
		\"59f94c0bdd241b70349eb72b\": {
			channels: {
				\"Floatplane Exclusive\": {
					title: \"Floatplane Exclusive\",
					skip: false,
					identifiers: [
						{
							check: \"FP Exclusive: \",
							type: \"title\"
						}
					],
					consoleColor: \"\u001b[38;5;200m\",
					daysToKeepVideos: 123
				},
			},
		},
	},
}"
```

Note the need to use escape characters for strings but not for keys, this is done using [JSON5](https://github.com/SerafimArts/json5) to make it easier to create/read and avoid issues with quotes in env variables.

All settings overwrittern by env or args will be applied to and modify the `settings.json` file.
Settings are applied in the following order:

- Missing defaults are set.
- args are set.
- env variable `__FPDSettings` is set.
- individual env variables are set.

This means that if you set a setting in a prior step and again in a subsequent step, it will be overridden.
