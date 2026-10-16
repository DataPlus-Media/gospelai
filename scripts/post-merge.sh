#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# Keep the running Metro watcher's entry files in place until reconciliation.
# A clean lockfile install has also been verified separately.
npm install --no-audit --no-fund
node scripts/prepare-library-web.cjs
# Device-local SQLite migrations run when the app opens.
echo "Post-merge dependencies and library packages restored."
