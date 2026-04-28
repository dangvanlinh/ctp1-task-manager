#!/bin/bash
set -e
set -o pipefail

# Wait for DB to accept connections (DB container may still be starting up)
echo "[start] waiting for DB to be ready..."
for i in $(seq 1 30); do
  if psql "$DATABASE_URL" -c 'SELECT 1' >/dev/null 2>&1; then
    echo "[start] ✓ DB ready (attempt $i)"
    break
  fi
  if [ "$i" = "30" ]; then
    echo "[start] ✗ DB not ready after 30 attempts — giving up but continuing"
  fi
  sleep 2
done

echo "[start] applying Prisma migrations..."
cd /app/apps/api && prisma migrate deploy || echo "[start] migrate deploy failed — continuing"

# One-time data import from Neon
if [ -n "$NEON_URL" ]; then
  USER_COUNT=$(psql "$DATABASE_URL" -t -A -c 'SELECT count(*) FROM "User";' 2>/dev/null | tr -d '[:space:]')
  if [ "$USER_COUNT" = "0" ]; then
    echo "[start] Empty DB detected. Importing data from Neon..."
    pg_dump "$NEON_URL" \
        --no-owner --no-acl --data-only --disable-triggers \
        -t '"User"' -t '"Project"' -t '"Build"' -t '"BuildMilestone"' \
        -t '"BuildAssignee"' -t '"Task"' -t '"ApiToken"' \
        -t '"WeeklyEventData"' -t '"MonthlyRevenue"' -t '"ProjectYearlyKpi"' \
      | psql "$DATABASE_URL" && echo "[start] ✓ Data imported" || echo "[start] ✗ Import failed"
  else
    echo "[start] DB already has data ($USER_COUNT users). Skip Neon import."
  fi
fi

echo "[start] launching API on :3000..."
cd /app/apps/api && node dist/index.js &
API_PID=$!

echo "[start] launching nginx on :80..."
nginx -g 'daemon off;' &
NGINX_PID=$!

wait -n $API_PID $NGINX_PID
EXIT_CODE=$?
kill $API_PID $NGINX_PID 2>/dev/null || true
exit $EXIT_CODE
