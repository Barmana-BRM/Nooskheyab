#!/bin/sh
set -eu
: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
output_dir="${BACKUP_DIR:-/backups}"
mkdir -p "$output_dir"
pg_dump --format=custom --file="$output_dir/pharmacy_mvp-$(date -u +%Y%m%dT%H%M%SZ).dump" --username="$POSTGRES_USER" "$POSTGRES_DB"
find "$output_dir" -type f -name '*.dump' -mtime +7 -delete
