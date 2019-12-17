#!/bin/sh

echo "Starting"

echo node version: `node --version`

if [ "$JUST_RUN" = "N" ]; then
  echo "Getting newest version from GitHub"
  cp /app/settings.json $CONFIG_PATH
  cp /app/partial.json $CONFIG_PATH
  cp /app/videos.json $CONFIG_PATH
  cd /
  sleep 2
  rm -rf /app/*
  sleep 2
  git clone $GIT_URL /tmp/floatplane-app
  mv -v /tmp/floatplane-app/* /app
  rm -rf /tmp/floatplane-app
  sleep 5
  cd /app
  npm install
  cp -f $CONFIG_PATH/settings.json /app
  cp -f $CONFIG_PATH/partial.json /app
  cp -f $CONFIG_PATH/videos.json /app
  echo "Update complete"
fi

echo "Updating permissions..."
for dir in /config /etc/s6.d; do
  if $(find $dir ! -user $UID -o ! -group $GID|egrep '.' -q); then
    echo "Updating permissions in $dir..."
    chown -R $UID:$GID $dir
  else
    echo "Permissions in $dir are correct."
  fi
done
echo "Done updating permissions."

echo "Moving settings file"
if [ ! -f $CONFIG_PATH/settings.json ]; then
  cp /app/settings.json $CONFIG_PATH
else
  cp -f $CONFIG_PATH/settings.json /app
fi
echo "Done moving settings file"

echo "Setting up settings using Environment Variables"
sed -i 's/"user": "",/"user": "'$USERNAME'",/' /app/settings.json
sed -i 's/"password": ""/"password": "'$PASSWORD'"/' /app/settings.json
sed -i 's/"videoFolder": ".*",/"videoFolder": "'${MEDIA_PATH//\//\\/}'",/' /app/settings.json
sed -i 's/"repeatScript": "false",/"repeatScript": "'$REPEAT_SCRIPT'",/' /app/settings.json
echo "Done setting up settings"

su-exec $UID:$GID /bin/s6-svscan /etc/s6.d
