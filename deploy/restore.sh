#!/bin/sh
set -eu

DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <lead-machine-YYYYMMDD-HHMMSS.db.gz>" >&2
  exit 1
fi

NAME=$(basename "$1")
SRC="$DIR/backups/$NAME"
if [ ! -f "$SRC" ]; then
  echo "Backup not found: $SRC" >&2
  exit 1
fi

TMP=""
cleanup() {
  if [ -n "$TMP" ]; then
    rm -f "$TMP"
  fi
}
trap cleanup EXIT

case "$NAME" in
  *.gz)
    TMP=$(mktemp)
    gzip -dc "$SRC" > "$TMP"
    COPY="$TMP"
    ;;
  *)
    COPY="$SRC"
    ;;
esac

echo "Stopping the app..."
docker compose -f "$DIR/docker-compose.yml" stop app

echo "Restoring $NAME into the persistent volume..."
docker run --rm \
  -v leadmachine_data:/data \
  -v "$COPY:/backup.db:ro" \
  alpine:3.21 \
  sh -c 'cp /backup.db /data/lead-machine.db && chown 1001:1001 /data/lead-machine.db'

echo "Starting the app..."
docker compose -f "$DIR/docker-compose.yml" start app

echo "Restore complete. Check: docker compose -f $DIR/docker-compose.yml ps"
