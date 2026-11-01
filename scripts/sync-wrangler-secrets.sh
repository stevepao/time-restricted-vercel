#!/usr/bin/env bash
# Push selected secrets from .env.local into the Cloudflare Worker.
# Requires: wrangler login (or CLOUDFLARE_API_TOKEN) and a local .env.local.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${1:-.env.local}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE"
  exit 1
fi

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
source "$ENV_FILE"
set +a

put_secret() {
  local name="$1"
  local value="${!name-}"
  if [[ -z "${value}" ]]; then
    echo "skip $name (empty)"
    return 0
  fi
  echo "put $name"
  printf '%s' "$value" | npx wrangler secret put "$name"
}

# Secrets only (not NEXT_PUBLIC_* site keys — those go in wrangler vars / dashboard)
put_secret REVALIDATE_SECRET
put_secret CF_DEPLOY_HOOK_URL
put_secret VERCEL_DEPLOY_HOOK_URL
put_secret WORDPRESS_REDIRECTION_USERNAME
put_secret WORDPRESS_REDIRECTION_APPLICATION_PASSWORD
put_secret MAILCHIMP_API_KEY
put_secret MAILCHIMP_LIST_ID
put_secret MAILCHIMP_TURNSTILE_SECRET_KEY
put_secret SMTP_USER
put_secret SMTP_PASS
put_secret SMTP_FROM
put_secret CONTACT_TO
put_secret CONTACT_TURNSTILE_SECRET_KEY
put_secret COMMENT_LOGIN_TURNSTILE_SECRET_KEY
put_secret NEXT_PUBLIC_MAILCHIMP_TURNSTILE_SITE_KEY
put_secret NEXT_PUBLIC_CONTACT_TURNSTILE_SITE_KEY
put_secret NEXT_PUBLIC_COMMENT_LOGIN_TURNSTILE_SITE_KEY

echo "Done."
echo "Add Turnstile hostnames for *.workers.dev and time-restricted.com in the Turnstile dashboard."
