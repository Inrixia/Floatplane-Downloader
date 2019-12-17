FROM alpine
LABEL maintainer="rob1998"

# Env variables
ENV GIT_URL "https://github.com/Inrixia/Floatplane-Downloader.git"
ENV JUST_RUN N
ENV CONFIG_PATH="/config"
ENV USERNAME="$USERNAME"
ENV PASSWORD="$PASSWORD"
ENV REPEAT_SCRIPT="1d"
ENV MEDIA_PATH="/media/"
ENV UID=991
ENV GID=991

# Copy files
COPY rootfs /

VOLUME /config

# Install some required packages
RUN apk add -U build-base \
				libssl1.1 \
				curl \
				git \
				su-exec \
				s6 \
				python \
				nodejs \
				nodejs-npm \
				ffmpeg \
		# Set permissions
		&& chmod a+x /usr/local/bin/* /etc/s6.d/*/* \
		# Cleanup
		&& apk del build-base \
		&& rm -rf /tmp/* /var/cache/apk/*

# create and set app directory
RUN mkdir -p /app/
WORKDIR /app/

# install app dependencies
# this is done before the following COPY command to take advantage of layer caching
COPY package.json .
RUN npm install

# copy app source to destination container
COPY . .

# Execute run.sh script
CMD ["run.sh"]
