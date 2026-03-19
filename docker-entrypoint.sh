#!/bin/sh
set -e

# Validate required environment variables
for var in DATABASE_URL REDIS_URL NEXTAUTH_SECRET NEXTAUTH_URL ENCRYPTION_KEY; do
  eval val=\$$var
  if [ -z "$val" ]; then
    echo "ERROR: Required environment variable $var is not set. Aborting." >&2
    exit 1
  fi
done

echo "▶ Running database migrations..."
npx drizzle-kit migrate

echo "▶ Starting Next.js server..."
# Find server.js - location varies depending on build environment
if [ -f "server.js" ]; then
  SERVER="server.js"
else
  SERVER=$(find . -name "server.js" -maxdepth 4 -not -path "*/node_modules/*" 2>/dev/null | head -1)
  if [ -z "$SERVER" ]; then
    echo "ERROR: Could not find server.js. Build output may be missing." >&2
    exit 1
  fi
  echo "Found server.js at: $SERVER"
fi

exec node "$SERVER"
