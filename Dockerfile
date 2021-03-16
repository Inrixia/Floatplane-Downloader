FROM node:latest

LABEL Description="This is a Node.js script to download the daily videos from LMG Floatplane and format them to be viewed in Plex."

# Env
ENV QUICKSTART=false
ENV VIDEOS_TO_SEARCH=5
ENV VIDEO_RESOLUTION="1080"

# Create Directory for the Container
WORKDIR /

# Copy src files into Working Directory
COPY . /
# In the future this should clone straight from GitHub
# RUN git clone https://github.com/inrixia/Floatplane-Downloader

# Script for npm install && npm run build
RUN npm install
RUN npm run build

# Define volumes to be mountable
VOLUME /artwork
VOLUME /db
VOLUME /config

# Runs on container start
CMD npm start


# FROM node:14
# WORKDIR /
# COPY package.json ./
# RUN npm install
# COPY ./dist .
# CMD node float.js