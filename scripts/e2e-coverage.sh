#!/usr/bin/env bash
# E2E coverage: runs the Playwright suite against a coverage build of the
# Compose stack, then writes
#   frontend/coverage-e2e/  (SPA, via Chromium V8 coverage + source maps)
#   backend/coverage-e2e/   (API, via NODE_V8_COVERAGE + c8)
# and restores the normal stack afterwards.
set -euo pipefail
cd "$(dirname "$0")/.."

compose_cov=(docker compose -f docker-compose.yml -f docker-compose.coverage.yml)

rm -rf backend/coverage-e2e frontend/coverage-e2e
mkdir -p backend/coverage-e2e/raw
chmod 777 backend/coverage-e2e/raw # the API runs as the container's `node` user

"${compose_cov[@]}" up -d --build --wait

status=0
(cd frontend && E2E_COVERAGE=1 pnpm e2e --reporter=list) || status=$?

# SIGTERM → the hook flushes coverage before Nest shuts down.
"${compose_cov[@]}" stop api

# The container ran /app/dist; map it onto an identical local build.
(cd backend && pnpm build >/dev/null)
sed -i.bak "s#file:///app/#file://$PWD/backend/#g" backend/coverage-e2e/raw/*.json
rm backend/coverage-e2e/raw/*.bak
(cd backend && pnpm exec c8 report \
  --temp-directory coverage-e2e/raw --reports-dir coverage-e2e \
  --all --src src --include 'src/**' --exclude 'src/**/*.spec.ts' --exclude-after-remap \
  --reporter text-summary --reporter html --reporter json-summary)

# Back to the normal images.
docker compose up -d --build --wait
exit $status
