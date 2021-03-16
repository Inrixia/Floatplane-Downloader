# Floatplane-Downloader
This project is unofficial and not in any way affiliated with LMG

# Basic Info:
- This is based on the GitHub project found here: https://github.com/inrixia/Floatplane-Downloader
- Information for in-depth usage can be found on the GitHub page.


# Docker Usage:
**Get started fast:**

    docker run inrixia/floatplane-downloader \
    [path]:/config \
    [path]:/db \
    [path]:/artwork

- [path] should be replaced with a directory on your machine to hold persistent data
- It won't do anything without setting the config.  This can be done manually, but should be easier using the environment variables.

**Environment Variables**

