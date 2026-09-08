#!/bin/sh
set -e

# Named volume can hide image node_modules on first run.
if [ ! -x node_modules/.bin/next ]; then
  echo "Installing frontend dependencies from package-lock.json..."
  npm ci
fi

exec "$@"
