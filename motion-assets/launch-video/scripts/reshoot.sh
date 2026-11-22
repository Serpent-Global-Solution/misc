#!/usr/bin/env bash
# One-command re-shoot of the phone, tablet and merchant-portal clips on the local launch-video stack.
# Needs: local Supabase (../local-supabase), container meikigo-api-launchvideo, webapp :3001, brand portal :3000, POS web :3003.
# Run between 10:15 and 21:30 — the outlet is open 10:00–22:00 and the API refuses queue joins after closing.
# RESHOOT_IGNORE_HOURS=1 skips the clock check (only when the outlet hours were widened for a late shoot).
#   ./reshoot.sh            real run (old outputs move to ../raw/old/<timestamp>/)
#   ./reshoot.sh --dry-run  outputs to ../raw/dryrun/ only
set -euo pipefail
cd "$(dirname "$0")"
DRY="${1:-}"
now=$(date +%H%M)
if [[ "$DRY" != "--dry-run" && -z "${RESHOOT_IGNORE_HOURS:-}" && ( 10#$now -lt 1015 || 10#$now -gt 2130 ) ]]; then
  echo "It's $(date +%H:%M). Run between 10:15 and 21:30 (shop hours 10:00–22:00)." >&2; exit 1
fi
for u in http://meiki-api.test:8083/health http://meiki-customer-webapp.test:3001/login http://meiki-brand.test:3000/login http://localhost:3003; do
  curl -sf -o /dev/null -m 60 "$u" || { echo "Not reachable: $u" >&2; exit 1; }
done
python3 seed.py
node record.mjs
python3 post.py $DRY
