#!/bin/sh
set -e

echo "▶ Running database migrations..."
npx drizzle-kit migrate

echo "▶ Starting Next.js server..."
exec node server.js
