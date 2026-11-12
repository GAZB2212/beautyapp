#!/usr/bin/env bash
# Create (or recreate) a local development database with all migrations applied and a
# published sample salon, for use with tools/local-backend when Docker is not available.
#   PGHOST / PGPORT / PGUSER select the server.
set -euo pipefail
cd "$(dirname "$0")/.."
DB="${DEV_DB:-salon_dev}"
psql -q -v ON_ERROR_STOP=1 -d postgres -c "drop database if exists $DB" -c "create database $DB" 2>/dev/null
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f scripts/pg-shim.sql 2>&1 | grep -v -e wal_level -e HINT || true
for f in supabase/migrations/*.sql; do
  psql -q -v ON_ERROR_STOP=1 -d "$DB" -f "$f" 2>&1 | grep -v NOTICE || true
done
psql -q -v ON_ERROR_STOP=1 -d "$DB" -f supabase/seed.sql
echo "database $DB ready"
