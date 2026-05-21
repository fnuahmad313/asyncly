#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy --config prisma.config.prod.js
echo "Migrations completed"

exec node dist/server.js