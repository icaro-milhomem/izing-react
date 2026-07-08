#!/bin/bash
# Separa o projeto em 2 repositórios no GitHub:
#   - icaro-milhomem/izing.open.io  → código antigo (Vue + wwebjs) no master
#   - icaro-milhomem/izing-react    → código novo (React + Baileys) no master
#
# Pré-requisito: criar repo vazio no GitHub:
#   https://github.com/new  → nome: izing-react  (sem README)
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NEW_REPO="${NEW_REPO:-git@github.com:icaro-milhomem/izing-react.git}"
OLD_REPO="${OLD_REPO:-git@github.com:icaro-milhomem/izing.open.io.git}"
LEGACY_COMMIT="${LEGACY_COMMIT:-b37958f}"

echo "=== 1/3 — Enviar versão NOVA (React + Baileys) para izing-react ==="
git remote remove izing-react 2>/dev/null || true
git remote add izing-react "$NEW_REPO"
git push -u izing-react master

echo ""
echo "=== 2/3 — Restaurar versão ANTIGA no izing.open.io (master) ==="
git push origin "${LEGACY_COMMIT}:master" --force-with-lease

echo ""
echo "=== 3/3 — Conferir ==="
git remote -v
echo ""
echo "izing-react (novo):  https://github.com/icaro-milhomem/izing-react"
echo "izing.open.io (antigo): https://github.com/icaro-milhomem/izing.open.io"
echo ""
echo "Branch local legacy preservada: legacy/vue-quasar-wwebjs"
echo "Seu working copy continua em master (versão nova)."
