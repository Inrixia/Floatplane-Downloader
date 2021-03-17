FROM node:latest

LABEL Description="This is a Node.js script to download the daily videos from LMG Floatplane and format them to be viewed in Plex."

# Static Environment variables required for docker usage
ENV RUN_IN_DOCKER=true

# Environment variables changable by the user
ENV QUICKSTART=false
ENV VIDEOS_TO_SEARCH=5
ENV VIDEO_RESOLUTION="1080"

# Create Directory for the Container
WORKDIR /fp

# Copy src files into Working Directory
COPY . /fp/

# Script for npm install && npm run build
RUN npm install
RUN npm run build

# Define volumes to be mountable
VOLUME /fp/artwork
VOLUME /fp/db
VOLUME /fp/config

# Runs on container start
CMD npm start


# FROM node:14
# WORKDIR /
# COPY package.json ./
# RUN npm install
# COPY ./dist .
# CMD node float.js