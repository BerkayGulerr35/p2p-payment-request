#!/usr/bin/env bash
# Loads .env into the shell, then starts Claude Code so .mcp.json can resolve
# ${SUPABASE_ACCESS_TOKEN} and ${SUPABASE_PROJECT_REF} for the Supabase MCP server.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env.local"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  echo "[claude.sh] Loaded env from $ENV_FILE"
else
  echo "[claude.sh] WARN: $ENV_FILE not found — copy .env.example to .env.local and fill it in"
fi

cd "$PROJECT_DIR"
exec claude "$@"
