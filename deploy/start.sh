#!/bin/sh
set -e

echo "[start] applying Prisma migrations..."
cd /app/api && node_modules/.bin/prisma migrate deploy || echo "[start] migrate deploy failed — continuing anyway"

echo "[start] launching API on :3000..."
cd /app/api && node dist/index.js &
API_PID=$!

echo "[start] launching nginx on :80..."
nginx -g 'daemon off;' &
NGINX_PID=$!

# Exit if either dies
wait -n $API_PID $NGINX_PID
EXIT_CODE=$?
echo "[start] a process died (exit $EXIT_CODE), shutting down"
kill $API_PID $NGINX_PID 2>/dev/null || true
exit $EXIT_CODE
