#!/bin/bash

npm run build

mkdir -p release/{linux,win,osx}/videos
cp build/Floatplane-PlexDownloader-win.exe release/win/floatplane.exe
cp build/Floatplane-PlexDownloader-macos release/osx/floatplane
cp build/Floatplane-PlexDownloader-linux release/linux/floatplane

cp ./{changelog.txt,settings.json,videos.json} release/linux
cp ./{changelog.txt,settings.json,videos.json} release/osx
cp ./{changelog.txt,settings.json,videos.json} release/win
