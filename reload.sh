#!/bin/sh

pkill -f "python3 -m http.server"

# Start server
python3 -m http.server &
SERVER_PID=$!

while true; do
  inotifywait -e close_write main.ts
  echo "Change detected, rebuilding..."
  npx tsc main.ts || true
  echo "Build complete! Refresh your browser."
done
