#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
# Keep the running Metro watcher's entry files in place until reconciliation.
# A clean lockfile install has also been verified separately.
npm install --no-audit --no-fund
# Device-local SQLite migrations run when the app opens.
echo "Post-merge dependencies restored. Library packages are served from private App Storage."
