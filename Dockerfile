FROM node:latest

LABEL Description="Project for automatically organizing and downloading Floatplane videos for plex."

# Environment variables
ENV DOCKER=true
ENV runQuickstartPrompts=false

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