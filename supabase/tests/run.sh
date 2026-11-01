#!/usr/bin/env bash
# Spins up a throwaway PostgreSQL, applies the shim + migrations + seed, runs the security tests.
# Usage: supabase/tests/run.sh   (needs initdb/pg_ctl/psql on PATH or under /usr/lib/postgresql/*/bin)
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"; ROOT="$HERE/.."
PGBIN="$(dirname "$(command -v initdb 2>/dev/null || ls /usr/lib/postgresql/*/bin/initdb | tail -1)")"
TMP="$(mktemp -d)"; PORT=55432
cleanup(){ "$PGBIN/pg_ctl" -D "$TMP/data" stop -m fast >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
RUNAS=""; if [ "$(id -u)" = "0" ]; then useradd -M pgtest 2>/dev/null || true; chown -R pgtest "$TMP"; RUNAS="runuser -u pgtest --"; fi
$RUNAS "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
$RUNAS "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -l "$TMP/log" start >/dev/null
PSQL=(psql -h "$TMP" -p $PORT -U postgres -d postgres -v ON_ERROR_STOP=1 -q -t)
"${PSQL[@]}" -f "$HERE/supabase_shim.sql"
for f in "$ROOT"/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f "$ROOT/seed.sql"
"${PSQL[@]}" -f "$HERE/rls_test.sql" 2>&1 | grep -E "ok  |FAIL|ERROR|PASSED" | sed -E "s/^.*(ok  |FAIL|ERROR)/\1/"
