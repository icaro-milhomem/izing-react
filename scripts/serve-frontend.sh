#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/frontend-react"
exec npx --yes serve -s dist -l "${FRONTEND_PORT:-4444}"
