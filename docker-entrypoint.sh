#!/bin/sh
set -e

# Compose's `depends_on: condition: service_healthy` already waited for
# Postgres to accept connections, so this just syncs the schema on boot.
# Idempotent, safe to run on every container start. No migration files
# needed for this assignment.
npx prisma db push --skip-generate

exec npm run start
