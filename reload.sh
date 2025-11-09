#!/bin/sh

# Kill any existing server
pkill -f "python3 -m http.server"

# Start server
python3 -m http.server &
SERVER_PID=$!

# Initial build
echo "Initial build..."
npx tsc main.ts || true
echo "Watching for changes..."

# Watch for changes (note the -m flag!)
inotifywait -m -e close_write main.ts | while read path action file; do
  echo "Change detected, rebuilding..."
  npx tsc main.ts || true
  echo "Build complete! Refresh your browser."
done
