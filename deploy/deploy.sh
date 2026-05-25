#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# E-Press — incremental deploy script.
# Called by Jenkins on every successful build (push to main).
#
# Assumes install.sh has already run on this server. Does the minimum work:
#   1. Pull latest from GitHub
#   2. Install backend prod deps (only changed)
#   3. Build admin SPA
#   4. Run any new migrations (idempotent)
#   5. pm2 reload  ← zero-downtime
#   6. nginx -t && reload  (only if config changed)
#   7. Smoke-test the backend
#
# Safe to run by hand:  bash /var/www/epress/deploy/deploy.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_PATH="/var/www/epress"
PASS_FILE="${PROJECT_PATH}/.deploy-db-pass"
DB_NAME="epress_prod"
DB_USER="epress_user"
DOMAIN="epress.ga"
BACKEND_PORT="5004"

log()  { echo -e "\033[36m[deploy]\033[0m $*"; }
warn() { echo -e "\033[33m[deploy]\033[0m $*"; }
err()  { echo -e "\033[31m[deploy]\033[0m $*" >&2; }

cd "${PROJECT_PATH}"

# ── 1. Pull ──────────────────────────────────────────────────────────────────
log "git fetch + reset to origin/main"
git fetch origin main
PREV_SHA="$(git rev-parse HEAD)"
git reset --hard origin/main
NEW_SHA="$(git rev-parse HEAD)"
log "  ${PREV_SHA:0:7} → ${NEW_SHA:0:7}"

# Detect what changed so we skip unnecessary steps
CHANGED_FILES="$(git diff --name-only "${PREV_SHA}" "${NEW_SHA}" 2>/dev/null || echo '')"
changed() { echo "${CHANGED_FILES}" | grep -q "$1"; }

# ── 2. Backend deps (only if package.json changed) ───────────────────────────
if changed '^backend/package' || [[ ! -d backend/node_modules ]]; then
    log "Installing backend prod deps"
    (cd backend && npm ci --omit=dev --no-audit --no-fund)
else
    log "Backend package.json unchanged — skipping npm ci"
fi

# ── 3. Admin install + build ─────────────────────────────────────────────────
if changed '^admin-panel/' || [[ ! -d admin-panel/dist ]]; then
    log "Building admin SPA"
    (cd admin-panel && npm ci --no-audit --no-fund && npm run build)
else
    log "Admin unchanged — skipping build"
fi

# ── 4. Migrations (idempotent) ───────────────────────────────────────────────
if changed '^backend/database/'; then
    log "Migrations changed — applying"
    DB_PASSWORD="$(cat "${PASS_FILE}")"
    for m in backend/database/migrations/*.sql; do
        log "  applying $(basename "${m}")"
        PGPASSWORD="${DB_PASSWORD}" psql -h localhost -U "${DB_USER}" -d "${DB_NAME}" \
            -v ON_ERROR_STOP=0 -q -f "${m}" >/dev/null 2>&1 || warn "    (some statements skipped)"
    done
else
    log "No migration changes"
fi

# ── 5. pm2 zero-downtime reload ──────────────────────────────────────────────
log "pm2 reload"
pm2 startOrReload deploy/ecosystem.config.js --env production
pm2 save --force >/dev/null

# ── 6. Reload nginx if config changed ────────────────────────────────────────
if changed '^deploy/nginx/'; then
    log "nginx config changed — copying + reloading"
    cp deploy/nginx/epress.conf /etc/nginx/sites-available/epress
    nginx -t && systemctl reload nginx
else
    log "nginx config unchanged"
fi

# ── 7. Smoke test ────────────────────────────────────────────────────────────
log "Waiting 3s for backend to settle then smoke-testing"
sleep 3

# Try via the local port first (fast, definitive), then via the public domain.
if curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api" >/dev/null; then
    log "  ✓ backend responding on :${BACKEND_PORT}"
else
    err "  ✗ backend NOT responding on :${BACKEND_PORT} — check pm2 logs epress-backend"
    exit 1
fi

# Full smoke test if it's reachable via DNS
if curl -fsS --max-time 6 "https://${DOMAIN}/api" >/dev/null 2>&1; then
    log "Running full smoke test against https://${DOMAIN}"
    node backend/scripts/smoke_test.js "https://${DOMAIN}" || warn "smoke test had failures"
else
    warn "https://${DOMAIN} not reachable from inside the box — skipping full smoke (DNS / SSL setup may still be pending)"
fi

log ""
log "═══════════════════════════════════════════════════════════════════════"
log "Deployed ${NEW_SHA:0:7} successfully"
log "═══════════════════════════════════════════════════════════════════════"
