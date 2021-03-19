FROM node:latest

LABEL Description="This is a Node.js script to download the daily videos from LMG Floatplane and format them to be viewed in Plex."

# Environment variables
ENV DOCKER=true
ENV runQuickstartPrompts=false
ENV downloadThreads=-1
ENV floatplane_videoResolution=1080
ENV floatplane_avalibleResolutions=1080
ENV floatplane_videosToSearch=5
ENV ffmpegPath=./db/
ENV repeat_enabled=true
ENV repeat_interval=00:05:00

# Create Directory for the Container
WORKDIR /fp

# Define volumes to be mountable
VOLUME /fp/db
VOLUME /fp/videos

# Install typescript so we can use the tsc command
RUN npm install -g typescript

# Copy package configs into working Directory
COPY ./package.json ./package-lock.json ./tsconfig.json /fp/

# Install required packages
RUN npm install

# Copy src files into Working Directory
COPY ./src /fp/src

# Compile the project
RUN tsc

# Runs on container start
CMD node ./dist/float.js