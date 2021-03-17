# Floatplane-Downloader
This project is unofficial and not in any way affiliated with LMG

# Basic Info:
- This is based on the GitHub project found here: https://github.com/inrixia/Floatplane-Downloader
- Information for in-depth usage can be found on the GitHub page.
- I will be maintaining this as I use it.

# Tags:
- `:latest`
	- Automatically builds whenever a commit is pushed to the Github repository
	- Should stay very up to date
	- May be incompatible as not all changes are tested for compatibility with the docker
- `:stable` 
	- Builds are created manually to ensure the docker works properly
	- May be slightly behind with updates as incompatibilities are solved before this build is updated

# Docker Usage:
**Get started fast:**

    $ docker run -it \
	    -v [path]:/fp/config \
	    -v [path]:/fp/db \
	    -v [path]:/fp/artwork \
	    -v [path]:/fp/videos \
	    -e QUICKSTART=true \
	    inrixia/floatplane-downloader
- [path] should be replaced with a directory on your machine to hold persistent data
- Setting the Quickstart environment variable to true will create an interactive pseudo-TTY to walk you through setting a persistent config.
	- In other words, It's a sweet looking questionnaire to help get you setup quickly.

**After walking through the Quickstart, you can run it normally  with this:**
   

    $ docker run \
	    -v [path]:/fp/config \
	    -v [path]:/fp/db \
	    -v [path]:/fp/artwork \
	    -v [path]:/fp/videos \
	    inrixia/floatplane-downloader

# Environment Variables:
Setting environment variables will overwrite the corresponding values in the config.  It is possible to always set environment variables and bypass the need for a persistent config.

The "Required variables" are only required if you do not have a config set at all.

**Required variables:**

- `VIDEOS_TO_SEARCH=[number value]` (default: 5) 
	- How many videos back from the latest do you want to search through for the ones to download?
- `VIDEO_RESOLUTION=[360, 720, 1080, 2160]` (default: 1080) 
	- What resolution would you like to download in?

**Optional Variables:**
- `DOWNLOAD_THREADS=[number value]`

**Example usage with Environment Variables:**

    $ docker run \
    	    -v [path]:/fp/db \
    	    -v [path]:/fp/artwork \
    	    -v [path]:/fp/videos \
    	    -e VIDEOS_TO_SEARCH=5
    	    -e VIDEO_RESOLUTION=1080
    	    inrixia/floatplane-downloader

