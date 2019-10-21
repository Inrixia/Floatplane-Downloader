FROM node:lts-alpine as base

RUN apk add --no-cache bash
RUN apk add --no-cache ffmpeg

COPY . /Floatplane-Downloader
WORKDIR /Floatplane-Downloader

CMD ["bash", "start"]
