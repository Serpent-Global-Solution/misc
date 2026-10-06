# Backup & Restore Runbook

Status as of 2026-08-22. Covers the two things `requirements.md`'s "Backups &
Data Recovery" section and the Launch checklist actually require: **30-day
retention, point-in-time recovery (PITR) enabled, and a monthly test
restore.** This replaces an earlier draft of this document that assumed a
self-hosted Postgres container and a custom `pg_dump` → OCI Object Storage
pipeline — the user has since decided to run Postgres on **OCI's managed
PostgreSQL-compatible database service** instead, which supplies retention
and PITR as a provider feature. See `deployment-doc.md` §3.2 for the
architecture change.

---

## 1. One-time provisioning checklist (needs a human — no real OCI access exists in this build environment)

This is the same kind of external dependency as the HitPay Platform Key and
the Brevo account: nobody can complete it from inside this repo or this
sandbox. Whoever has OCI console access needs to do the following before
`deployment/docker-compose.yml` can start against production:

1. **Create the managed PostgreSQL instance.** Oracle's fully managed
   Postgres-compatible offering on OCI is a real product (announced 2024,
   generally available since), commonly referred to as **"OCI Database with
   PostgreSQL."** ⚠️ **Honesty check, not a guess dressed up as fact:** the
   exact current console navigation (which menu it sits under), its precise
   plan/shape names, and whether it is still covered by any Always Free
   allowance are details that can drift over time and that this environment
   cannot verify against a live OCI console. Whoever provisions this should
   confirm the exact current path in the OCI console/docs at the time they
   do it, rather than trusting a screenshot-level description written here
   from training knowledge. What follows is the *configuration intent*,
   which will not have drifted even if the exact click-path has:
   - A single instance/DB system is enough at this scale — it is meant to
     replace the one Postgres process this stack used to run in a
     container, not to introduce a cluster.
   - Choose a shape/tier sized similarly to what the VM's Postgres container
     was doing (this stack is a single small VM — do not over-provision).
2. **Enable automated backups with 30-day retention.** This is almost
   certainly a toggle plus a retention-window field on the instance's
   backup configuration (console or `oci db-system` / equivalent CLI command
   for the Postgres-specific service, not the legacy DB Systems CLI verbs
   used for Oracle Database) — set the retention window to **30 days**
   exactly, matching `requirements.md`'s locked number. Do not accept a
   shorter provider default without changing it.
3. **Enable point-in-time recovery (PITR).** On a managed service this is
   normally bundled with automated backups plus continuous WAL/log
   shipping the provider manages internally — there should be an explicit
   "point-in-time recovery" toggle or an equivalent "restore to any point
   within the retention window" capability description. Confirm it is
   turned on, not just that backups exist — a snapshot-only backup without
   log shipping cannot restore to an arbitrary point in time, only to
   whatever moment the last snapshot was taken.
4. **Create both databases.** This mirrors the two-databases-one-server
   topology the self-hosted container used to have:
   - `meikigo` (the API's database)
   - `meikigo-keycloak` (Keycloak's database) — **do not skip this one.**
     Losing Keycloak's data means losing every account on the platform, so
     it needs the same 30-day/PITR guarantee as `meikigo`, not a lesser one.
   - There is no `initdb`-style first-boot hook on a managed instance. Connect
     with an admin client (`psql`, or the one-off dockerized client this repo
     already uses — see §3) and run:
     ```sql
     CREATE DATABASE "meikigo-keycloak";
     ```
5. **Narrow network access to the VM.** The instance should not be reachable
   from the open internet. Managed Postgres services on OCI typically offer
   either a private endpoint inside the same VCN as the compute instance, or
   an allow-listed set of source IPs/security rules if a public endpoint is
   unavoidable. Prefer the private-VCN-endpoint option if the OCI console
   offers it for this service — it means the database is never exposed to
   the internet at all, matching this stack's existing "Postgres is never
   public" principle (`deployment-doc.md` §5) even though it is no longer a
   container on this VM's own Docker network.
6. **Generate credentials and fill in `deployment/.env`.** Set
   `MANAGED_DB_HOST`, `MANAGED_DB_PORT`, `MANAGED_DB_ADMIN_USERNAME`,
   `MANAGED_DB_ADMIN_PASSWORD`, `MANAGED_DB_NAME` (see `.env.example`).
7. **Confirm TLS.** The connection strings this stack sends
   (`ConnectionStrings__Meikigo` in `docker-compose.yml`'s `api:` service,
   `KC_DB_URL` in its `keycloak:` service) both request `SSL Mode=Require` /
   `sslmode=require`. Confirm the managed instance actually terminates TLS
   on its listener — it should by default, but this is worth confirming once
   rather than assuming.

**None of steps 1–7 can be verified from this build environment** — there is
no real OCI account here, exactly the HitPay Platform Key and Brevo account
situation already tracked in `reporting.md`. What *has* been verified for
real, without needing any of the above, is the restore-verification tooling
in §3 below, end to end, against a real running Postgres instance and a real
scratch container.

---

## 2. What "backup" means now, in plain terms

- **Meikigo does not run any backup code.** No cron job, no scheduled task,
  no `pg_dump` pipeline, no Object Storage upload, no retention-pruning
  script. The managed database service takes the daily backup, enforces the
  30-day retention window, and maintains the WAL stream that makes
  point-in-time recovery possible — all as configuration turned on once
  during provisioning (§1), not as anything this repo builds or schedules.
- **This is what makes the wording in `legal/merchant-terms-of-purchase.md`
  §6 and `legal/client-privacy-notice.md` §7 true**, once §1 above is
  actually done: *"We take a daily backup of our database, retained for 30
  days with point-in-time recovery enabled."* Before §1 is completed, that
  sentence describes an intention, not yet a fact — do not treat this
  runbook's existence as proof the sentence is already true in production.
- **What this repo still owns:** the tooling to actually *prove* a backup
  restores (§3), because an untested backup is not a backup
  (`requirements.md`'s own words on this).

---

## 3. Monthly restore test — the recurring human task

`requirements.md` names this as a recurring human task, not something to
automate away — someone has to actually run a restore periodically and look
at the result. What follows is how, using the tool this repo now ships.

### 3a. Preferred mechanism: the managed service's own restore-to-new-instance

The realistic way to prove a *managed-service* backup restores is to use the
provider's own restore feature — typically "restore to a new instance" from
either the latest automated backup or a chosen point in time within the
retention window, via the OCI console or CLI. This is provider-specific
enough that this repo cannot script it without a real account to test
against (§1's honesty caveat applies equally here). The checklist for
whoever runs the monthly test:

1. In the OCI console, find the managed Postgres instance and its restore
   action. Choose "restore to a new instance," picking either the most
   recent automated backup or an arbitrary point-in-time within the last 30
   days (to actually exercise the PITR claim, not just the daily-snapshot
   claim, alternate which one you pick from month to month).
2. Wait for the new instance to come up.
3. Point the tooling in §3b at that new instance's connection details
   (temporarily, for this test only) to run the same table/row-count sanity
   check this repo can run against any Postgres endpoint — or, simpler,
   connect with `psql` and manually spot-check row counts against what the
   monthly report/dashboard shows for a known Brand.
4. **Tear the restored instance down again** once satisfied — it is a paid
   resource that exists only to prove the restore works, not a spare copy to
   keep running.
5. Record the date, who ran it, and the result (see §4).

### 3b. The tool this repo ships: `deployment/scripts/take-test-dump.sh` + `deployment/scripts/restore-verify.sh`

These two scripts do **not** talk to OCI Object Storage or any custom backup
pipeline — they are a generic "take a dump from any reachable Postgres, then
prove a restore of that dump produces the expected data" pair. They work
identically against the managed instance, a local dev Postgres, or (as
already verified — see §5) the existing `meikigo-app-postgres` dev
container. Use them either as a stand-in for 3a when there is no OCI access
to test with, or as an extra, narrower check alongside 3a.

Both scripts run all `pg_dump`/`pg_restore`/`psql` work inside a
`postgres:16-alpine` container rather than requiring any Postgres client
tools installed on the host — this was a deliberate fix after a real bug was
found during testing (see §5): a newer host-installed client can send
session-setup commands an older server GUC set doesn't recognize
(`transaction_timeout`, added in PostgreSQL 17), which made `pg_restore`
report spurious errors against this stack's PostgreSQL 16 target. Running
the matching client image removes that whole failure class and means the
only host prerequisite is Docker itself.

**Step 1 — take a dump + manifest from the source database:**

```bash
cd deployment/scripts
PGHOST=<managed-db-host-or-container-name> \
PGPORT=5432 \
PGUSER=<admin-username> \
PGPASSWORD=<admin-password> \
PGDATABASE=meikigo \
./take-test-dump.sh /path/to/output-dir
```

Set `DOCKER_NETWORK=<name>` as well if `PGHOST` is a container name on a
Docker network rather than a real external hostname (needed for local
testing; not needed against the real managed instance's public/VCN
endpoint, which is reachable like any other external host). Repeat with
`PGDATABASE=meikigo-keycloak` to test the second database — both need the
same restore confidence, since losing Keycloak's data is just as fatal as
losing `meikigo`'s.

This produces two files: a compressed custom-format dump
(`<db>-<timestamp>.dump`) and a plain-text manifest
(`<db>-<timestamp>.manifest.txt`, one `schema.table<TAB>row_count` line per
table) — the "known state" the restore gets checked against.

**Step 2 — restore that dump into a scratch instance and verify it:**

```bash
./restore-verify.sh /path/to/output-dir/meikigo-<timestamp>.dump \
                     /path/to/output-dir/meikigo-<timestamp>.manifest.txt
```

This script, with no other input needed:
1. Creates a throwaway Docker network and a throwaway `postgres:16-alpine`
   container (never touches any real data — it is a brand-new empty
   instance).
2. Waits for it to become ready.
3. Restores the dump into it.
4. Checks every table named in the manifest actually exists post-restore
   and has exactly the row count the manifest recorded.
5. Tears the scratch container and network down again, always (even on
   failure) via a shell `trap`.
6. Prints `OK`/`FAIL` per table and a final `PASS`/`FAIL` line, and exits
   non-zero on any failure — safe to wire into a script or CI step that
   needs a real exit code, not just human-readable output.

### 4. What a healthy result looks like vs. a failure

**Healthy (§3b tool):** every table line reads `OK: table <name> has <N>
rows`, and the last line is `PASS: restore verified for real — every table
in the manifest exists with the expected row count.` Exit code `0`.

**Unhealthy:** any `FAIL:` line — either `table <name> has <X> rows,
expected <Y>` (data mismatch — something was lost, duplicated, or the dump
was stale) or `table <name> is missing after restore` (a whole table failed
to come back — treat this as more serious than a count mismatch, it usually
means the restore aborted partway through). The final line reads `FAIL: <N>
table(s) did not match the manifest — this backup did NOT restore cleanly.`
Exit code `1`. **Do not mark the monthly test as passed if this happens** —
escalate and investigate why before trusting the next daily backup.

**Healthy (§3a, provider restore-to-new-instance):** the new instance comes
up, and spot-checked row counts / a known record (e.g. a specific Brand's
subscription status, or transaction count for a known day) match what
production shows for that same point in time.

**Record the result every month** — who ran it, which mechanism (3a or 3b),
the date/point-in-time chosen, and pass/fail — even a one-line entry in this
file's own changelog-style bottom section or an internal tracker is enough.
An untested backup is not a backup, and a backup tested once at launch and
never again is not much better.

---

## 5. Verified for real, in this build environment (2026-08-22)

No real OCI account exists here, so §1 and §3a could not be exercised
end-to-end. What **was** verified for real, against a genuinely running
Postgres instance in this environment (the existing `meikigo-app-postgres`
dev container backing `meikigo-api-local`, with real data from this
project's own development history — 23 Brands, 20 Transactions, 53
UserAccounts, 68 tables total, not a toy fixture):

1. `take-test-dump.sh` dumped that real database (both a `pg_dump -Fc` file
   and a 68-line row-count manifest) using the dockerized-client approach,
   with zero Postgres client tools installed on the host running the script.
2. `restore-verify.sh` restored that exact dump into a freshly created,
   throwaway `postgres:16-alpine` scratch container on a throwaway Docker
   network, and confirmed **all 68 tables** existed post-restore with row
   counts exactly matching the manifest — a genuine `PASS`.
3. The scratch container and network were both confirmed torn down
   afterward (`docker ps -a` / `docker network ls` showed nothing left
   over) — the tool cleans up after itself even though this particular run
   was a pass, not just on the failure path.
4. **Failure detection was also verified, not assumed:** a tampered manifest
   (one real table's expected row count changed from 23 to 9999, plus one
   entirely fictitious table name added) was fed into `restore-verify.sh`
   against the same real dump. It correctly reported both failure modes —
   `FAIL: table public.brands has 23 rows, expected 9999` and
   `FAIL: table public.this_table_does_not_exist is missing after restore`
   — rolled them into `FAIL: 2 table(s) did not match the manifest`, and
   exited non-zero, while still cleanly tearing down its scratch resources.
5. A real bug was found and fixed during this testing, not glossed over:
   the first version of these scripts shelled out to whatever `pg_dump`/
   `pg_restore`/`psql` happened to be on the host's `PATH`. On this
   particular host that was Homebrew's PostgreSQL 18.4 client, which sent a
   `SET transaction_timeout = 0;` session-setup command that PostgreSQL 16
   (this stack's actual server version) rejects as an unrecognized
   parameter, producing a spurious `pg_restore` failure unrelated to the
   actual data. Both scripts were rewritten to run all Postgres client
   commands inside a matching `postgres:16-alpine` container instead, which
   both fixed the bug and removed the "install a Postgres client on the OCI
   VM" prerequisite entirely — Docker is the only host dependency now.

What was **not** verified, and needs the human step in §1 before it can be:
provisioning the real managed instance, confirming its actual retention/PITR
console settings, and running §3a's provider-native restore-to-new-instance
against real production data.
