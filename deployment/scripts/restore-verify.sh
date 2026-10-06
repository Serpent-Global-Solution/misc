#!/usr/bin/env bash
set -euo pipefail

if [ "${MEIKIGO_IN_CONTAINER:-}" = "1" ]; then
  DBHOST="$1"
  DBPORT="$2"
  DBUSER="$3"
  DBNAME="$4"
  DUMPFILE="/restore.dump"
  MANIFEST="/manifest.txt"

  echo "Restoring into ${DBHOST}:${DBPORT}/${DBNAME}..."
  if ! pg_restore -h "$DBHOST" -p "$DBPORT" -U "$DBUSER" -d "$DBNAME" --no-owner --no-privileges "$DUMPFILE"; then
    echo "FAIL: pg_restore reported errors — see output above"
    exit 1
  fi

  FAILURES=0
  while IFS=$'\t' read -r TABLE EXPECTED; do
    [ -z "$TABLE" ] && continue
    ACTUAL="$(psql -h "$DBHOST" -p "$DBPORT" -U "$DBUSER" -d "$DBNAME" -Atqc "select count(*) from ${TABLE};" 2>/dev/null)" || ACTUAL="MISSING"
    if [ "$ACTUAL" = "MISSING" ] || [ -z "$ACTUAL" ]; then
      echo "FAIL: table ${TABLE} is missing after restore (expected ${EXPECTED} rows)"
      FAILURES=$((FAILURES + 1))
    elif [ "$ACTUAL" != "$EXPECTED" ]; then
      echo "FAIL: table ${TABLE} has ${ACTUAL} rows, expected ${EXPECTED}"
      FAILURES=$((FAILURES + 1))
    else
      echo "OK:   table ${TABLE} has ${ACTUAL} rows"
    fi
  done < "$MANIFEST"

  if [ "$FAILURES" -eq 0 ]; then
    echo "PASS: restore verified for real — every table in the manifest exists with the expected row count."
    exit 0
  else
    echo "FAIL: ${FAILURES} table(s) did not match the manifest — this backup did NOT restore cleanly."
    exit 1
  fi
fi

usage() {
  echo "Usage: $0 <dump-file> <manifest-file>"
  exit 1
}

[ $# -eq 2 ] || usage
DUMPFILE="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
MANIFEST="$(cd "$(dirname "$2")" && pwd)/$(basename "$2")"
SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"

[ -f "$DUMPFILE" ] || { echo "FAIL: dump file not found: $DUMPFILE"; exit 1; }
[ -f "$MANIFEST" ] || { echo "FAIL: manifest file not found: $MANIFEST"; exit 1; }

: "${PG_CLIENT_IMAGE:=postgres:16-alpine}"

TS="$(date -u +%Y%m%dT%H%M%SZ)"
NETWORK="meikigo-restore-verify-net-${TS}"
CONTAINER="meikigo-restore-verify-${TS}"
DBNAME="restore_verify"
DBUSER="restore_verify"
DBPASS="restore-verify-scratch-password"

cleanup() {
  echo "Tearing down scratch container and network..."
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker network create "$NETWORK" >/dev/null

echo "Starting scratch Postgres container ${CONTAINER} (${PG_CLIENT_IMAGE})..."
docker run -d --name "$CONTAINER" --network "$NETWORK" \
  -e POSTGRES_DB="$DBNAME" \
  -e POSTGRES_USER="$DBUSER" \
  -e POSTGRES_PASSWORD="$DBPASS" \
  "$PG_CLIENT_IMAGE" >/dev/null

echo "Waiting for scratch Postgres to become ready..."
ATTEMPTS=0
until docker run --rm --network "$NETWORK" -e PGPASSWORD="$DBPASS" "$PG_CLIENT_IMAGE" \
  pg_isready -h "$CONTAINER" -p 5432 -U "$DBUSER" -d "$DBNAME" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 60 ]; then
    echo "FAIL: scratch Postgres never became ready"
    exit 1
  fi
  sleep 1
done

docker run --rm --network "$NETWORK" \
  -e MEIKIGO_IN_CONTAINER=1 \
  -e PGPASSWORD="$DBPASS" \
  -v "$DUMPFILE":/restore.dump:ro \
  -v "$MANIFEST":/manifest.txt:ro \
  -v "$SCRIPT_PATH":/restore-verify.sh:ro \
  "$PG_CLIENT_IMAGE" \
  /restore-verify.sh "$CONTAINER" 5432 "$DBUSER" "$DBNAME"
