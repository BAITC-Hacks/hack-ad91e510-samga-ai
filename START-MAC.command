#!/bin/sh
cd -- "$(dirname -- "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 24 or newer is required: https://nodejs.org/"
  printf "Press Return to close..."
  read -r answer
  exit 1
fi
echo "Open http://127.0.0.1:4197/ (stop with Ctrl+C)"
if [ -f backend/.env ]; then
  node --env-file=backend/.env backend/server.mjs
else
  node backend/server.mjs
fi
result=$?
if [ "$result" -ne 0 ]; then
  echo "Start failed. Check Node.js 24+, port 4197, and the terminal output." >&2
  if [ -t 0 ]; then
    printf "Press Return to close..."
    read -r answer
  fi
fi
exit "$result"
