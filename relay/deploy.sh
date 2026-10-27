#!/usr/bin/env bash
# Deploys Itqan's push relay (ADR-037) to your own free Cloudflare account and prints its address.
# The first run opens a browser to sign in to Cloudflare. Safe to re-run: it updates in place.
set -euo pipefail
cd "$(dirname "$0")"

# The hosted app's origin, from the git remote: github.com/<owner>/<repo> → https://<owner>.github.io
remote=$(git remote get-url origin)
owner=$(printf '%s' "$remote" | sed -E 's#.*github\.com[:/]([^/]+)/.*#\1#' | tr '[:upper:]' '[:lower:]')
origin="https://${owner}.github.io"
extra="${ITQAN_RELAY_EXTRA_ORIGINS:-}"   # e.g. http://localhost:5181 for testing in dev
origins="$origin${extra:+,$extra}"

echo "Deploying the push relay for $origins"
npx --yes wrangler@4.154.0 deploy --var "ALLOWED_ORIGINS:$origins"
echo
echo "Done. Copy the https://itqan-push-relay.<…>.workers.dev address printed above —"
echo "it goes in the repo variable PUSH_RELAY_URL (see relay/README.md)."
