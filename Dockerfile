FROM node:current-alpine AS build

# Make pnpm available
RUN npm i -g pnpm

# working directory for the build
WORKDIR /build

# Copy package configs into working Directory
COPY ./package.json ./pnpm-lock.yaml ./tsconfig.json /build/

# Install required packages
RUN pnpm i

# Copy src files into Working Directory
COPY ./src /build/src

# Compile the project
RUN pnpm run bundle

# Copy built artifacts and dependencies into a minimal release image
FROM node:current-alpine AS release

LABEL Description="Project for automatically organizing and downloading Floatplane videos for plex."

# Create Directory for the Container
WORKDIR /fp

COPY --from=build /build/dist/float.cjs float.cjs
COPY --from=build /build/package.json package.json

# Environment variables
ENV headless=true

# Define volumes to be mountable
VOLUME /fp/db
VOLUME /fp/videos

# Runs on container start
CMD ["node", "./float.cjs"]
