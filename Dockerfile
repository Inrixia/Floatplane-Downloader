FROM node:latest

LABEL Description="Project for automatically organizing and downloading Floatplane videos for plex."

# Environment variables
ENV headless=true
ENV runQuickstartPrompts=false

# Create Directory for the Container
WORKDIR /fp

# Define volumes to be mountable
VOLUME /fp/db
VOLUME /fp/videos

# Copy package configs into working Directory
COPY ./package.json ./package-lock.json ./tsconfig.json /fp/

# Install required packages
RUN npm install

# Copy src files into Working Directory
COPY ./src /fp/src

# Compile the project
RUN npx tsc

# Runs on container start
CMD node ./dist/float.js