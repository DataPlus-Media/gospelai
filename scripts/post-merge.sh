#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Restore exactly the dependencies recorded by the merged lockfile.
npm ci --no-audit --no-fund

# Device-local SQLite migrations run when the app opens. The development
# workflow is restarted by Replit after this script succeeds.
echo "Post-merge dependencies restored."
