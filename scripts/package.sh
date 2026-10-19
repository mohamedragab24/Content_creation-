#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-$ROOT/souqna-marketplace.zip}"
cd "$ROOT"
zip -qr "$OUT" \
  README.md plan.md TODO.md package.json package-lock.json .env.example vercel.json \
  server public api database apps scripts \
  -x '*/node_modules/*' '*/.dart_tool/*' '*/build/*' '*/.DS_Store' '*.log' '*.zip'
printf '%s\n' "$OUT"
