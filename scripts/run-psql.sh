#!/usr/bin/env bash
set -euo pipefail

DB_URL="${SUPABASE_DB_URL:-${POSTGRES_URL_NON_POOLING:-${POSTGRES_URL:-}}}"

if [[ -z "${DB_URL}" ]]; then
  echo "Missing database URL. Set SUPABASE_DB_URL or POSTGRES_URL_NON_POOLING or POSTGRES_URL."
  exit 1
fi

psql "${DB_URL}" -v ON_ERROR_STOP=1 "$@"
