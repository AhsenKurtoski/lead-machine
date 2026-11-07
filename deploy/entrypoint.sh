#!/bin/sh
set -eu

if [ -z "${APP_PASSWORD:-}" ]; then
  echo "APP_PASSWORD is required. Set it in deploy/.env (at least 8 characters)." >&2
  exit 1
fi
if [ "${#APP_PASSWORD}" -lt 8 ]; then
  echo "APP_PASSWORD must be at least 8 characters." >&2
  exit 1
fi

DATABASE_URL="${DATABASE_URL:-file:/data/lead-machine.db}"
DB_FILE="${DATABASE_URL#file:}"
SEED_MARKER="$(dirname "$DB_FILE")/.lead-machine-seeded"
mkdir -p "$(dirname "$DB_FILE")"

if [ ! -f "$DB_FILE" ]; then
  echo "First boot: creating the SQLite database and seed..."
  npm run setup
  touch "$SEED_MARKER"
elif [ ! -f "$SEED_MARKER" ]; then
  echo "Existing database without seed marker: applying schema and seed..."
  npx prisma db push --skip-generate
  npm run db:seed
  touch "$SEED_MARKER"
else
  echo "Existing database found: applying the Prisma schema..."
  npx prisma db push --skip-generate
fi

exec ./node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
