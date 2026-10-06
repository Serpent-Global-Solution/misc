#!/usr/bin/env bash
set -euo pipefail

if [ "${MEIKIGO_IN_CONTAINER:-}" = "1" ]; then
  OUTDIR="$1"
  TS="$(date -u +%Y%m%dT%H%M%SZ)"
  DUMPFILE="$OUTDIR/${PGDATABASE}-${TS}.dump"
  MANIFEST="$OUTDIR/${PGDATABASE}-${TS}.manifest.txt"

  echo "Dumping ${PGDATABASE}@${PGHOST}:${PGPORT} to ${DUMPFILE}..."
  pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -Fc -f "$DUMPFILE"

  echo "Building row-count manifest..."
  TABLES="$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -Atqc "select quote_ident(schemaname) || '.' || quote_ident(tablename) from pg_tables where schemaname not in ('pg_catalog','information_schema') order by 1;")"

  : > "$MANIFEST"
  while IFS= read -r TABLE; do
    [ -z "$TABLE" ] && continue
    COUNT="$(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -Atqc "select count(*) from ${TABLE};")"
    printf '%s\t%s\n' "$TABLE" "$COUNT" >> "$MANIFEST"
  done <<< "$TABLES"

  echo "Dump:     $DUMPFILE"
  echo "Manifest: $MANIFEST"
  echo "Keep both together — restore-verify.sh needs the manifest to know what a healthy restore looks like."
  exit 0
fi

usage() {
  echo "Usage: PGHOST=... PGPORT=5432 PGUSER=... PGPASSWORD=... PGDATABASE=... [DOCKER_NETWORK=...] $0 <output-dir>"
  exit 1
}

[ $# -eq 1 ] || usage
mkdir -p "$1"
OUTDIR="$(cd "$1" && pwd)"
SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

: "${PGHOST:?PGHOST is required}"
: "${PGPORT:=5432}"
: "${PGUSER:?PGUSER is required}"
: "${PGPASSWORD:?PGPASSWORD is required}"
: "${PGDATABASE:?PGDATABASE is required}"
: "${PG_CLIENT_IMAGE:=postgres:16-alpine}"

NETWORK_ARGS=()
if [ -n "${DOCKER_NETWORK:-}" ]; then
  NETWORK_ARGS=(--network "$DOCKER_NETWORK")
fi

echo "Using dockerized pg_dump/psql (${PG_CLIENT_IMAGE}) — no Postgres client needs to be installed on this host, and the client version always matches the server family this stack runs."
docker run --rm "${NETWORK_ARGS[@]}" \
  -e MEIKIGO_IN_CONTAINER=1 \
  -e PGHOST="$PGHOST" \
  -e PGPORT="$PGPORT" \
  -e PGUSER="$PGUSER" \
  -e PGPASSWORD="$PGPASSWORD" \
  -e PGDATABASE="$PGDATABASE" \
  -v "$OUTDIR":/out \
  -v "$SCRIPT_PATH":/take-test-dump.sh:ro \
  "$PG_CLIENT_IMAGE" \
  /take-test-dump.sh /out
