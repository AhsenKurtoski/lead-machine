#!/bin/sh
set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$DIR/backups/lead-machine-$STAMP.db"
mkdir -p "$DIR/backups"

# SQLite .backup is safe while the app is running (unlike a raw cp).
docker compose -f "$DIR/docker-compose.yml" exec -T app sh -c \
  "mkdir -p /data/backups && sqlite3 /data/lead-machine.db \".backup '/data/backups/$STAMP.db'\""
docker compose -f "$DIR/docker-compose.yml" cp \
  "app:/data/backups/$STAMP.db" "$OUT"
docker compose -f "$DIR/docker-compose.yml" exec -T app \
  rm -f "/data/backups/$STAMP.db"

gzip -9 "$OUT"
find "$DIR/backups" -type f -name 'lead-machine-*.db.gz' -mtime +14 -delete

echo "Backup created: $OUT.gz"
