#!/usr/bin/env bash
# One-time Cloudflare resource + secret bootstrap for time-restricted Workers.
# Prerequisites: `npx wrangler login` (or CLOUDFLARE_API_TOKEN set).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Creating R2 bucket (ok if it already exists)"
npx wrangler r2 bucket create time-restricted-next-cache || true

echo "==> Creating D1 database"
CREATE_OUT="$(npx wrangler d1 create time-restricted-next-tag-cache 2>&1 || true)"
echo "$CREATE_OUT"

DB_ID="$(printf '%s\n' "$CREATE_OUT" | sed -n 's/.*"database_id": "\([^"]*\)".*/\1/p' | head -1)"
if [[ -z "${DB_ID}" ]]; then
  echo "Could not parse database_id from create output."
  echo "If the DB already exists, run: npx wrangler d1 list"
  echo "Then paste the UUID into wrangler.jsonc → d1_databases[0].database_id"
else
  echo "Updating wrangler.jsonc database_id → ${DB_ID}"
  python3 - <<PY
from pathlib import Path
path = Path("wrangler.jsonc")
text = path.read_text()
old = '"database_id": "00000000-0000-0000-0000-000000000000"'
new = f'"database_id": "{DB_ID}"'
if old not in text:
    raise SystemExit("Placeholder database_id not found; update wrangler.jsonc manually.")
path.write_text(text.replace(old, new, 1))
print("wrangler.jsonc updated.")
PY
fi

echo "==> Applying D1 schema (remote + local)"
npx wrangler d1 execute time-restricted-next-tag-cache --remote --file=./migrations/0001_revalidations.sql
npx wrangler d1 execute time-restricted-next-tag-cache --local --file=./migrations/0001_revalidations.sql

echo "==> Next steps:"
echo "1. Copy secrets from Vercel into: npx wrangler secret put <NAME>"
echo "   See docs/cloudflare-workers-migration.md"
echo "2. Add Turnstile hostnames for *.workers.dev + time-restricted.com"
echo "3. npm run deploy"
echo "4. Smoke-test the workers.dev URL before DNS cutover"
