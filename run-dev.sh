#!/bin/bash
# Script to run Vue development server with reduced file watching
# This helps avoid ENOSPC errors on systems with limited file watchers

# Set Node options to increase memory and reduce watcher pressure
export NODE_OPTIONS="--max-old-space-size=4096"
export CHOKIDAR_USEPOLLING=true

# Run the Vue development server
npm run serve