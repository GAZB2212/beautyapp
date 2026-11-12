#!/usr/bin/env bash
# Run the database tests against a plain local Postgres (no Docker needed).
# CI and day-to-day development should prefer `supabase start && supabase test db`.
#   PGHOST / PGPORT / PGUSER select the server. Requires pgTAP and pg_prove.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${TEST_DB:-salon_test}"
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB" 2>/dev/null
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f scripts/pg-shim.sql 2>&1 | grep -v -e wal_level -e HINT || true
for f in supabase/migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" 2>&1 | grep -v NOTICE || true
done
pg_prove -d "$DB" supabase/tests/*.test.sql
