#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONDA="$HOME/miniconda3"

echo "=== IZING — Iniciando ambiente de desenvolvimento ==="

if ! pg_isready -h localhost -p 5432 &>/dev/null 2>&1; then
  bash "$ROOT/setup-local.sh"
fi

source "$CONDA/etc/profile.d/conda.sh" 2>/dev/null || true
export PATH="$CONDA/bin:$PATH"

mkdir -p "$ROOT/.local-data/logs"

echo ">>> Backend: migrate"
cd "$ROOT/backend"
npx sequelize db:migrate

echo ">>> Backend: seed (no-op se primeiro acesso já configurado)"
npx sequelize db:seed:all 2>/dev/null || true

echo ">>> Iniciando backend (porta 3000)..."
pkill -f "ts-node-dev.*src/server.ts" 2>/dev/null || true
pkill -f "dist/server.js" 2>/dev/null || true
npm run dev:server >> "$ROOT/.local-data/logs/backend.log" 2>&1 &

BACKEND_OK=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "http://127.0.0.1:3000/auth/login" -X OPTIONS -o /dev/null 2>/dev/null; then
    BACKEND_OK=1
    break
  fi
  sleep 2
done

if [ "$BACKEND_OK" -eq 0 ]; then
  echo "AVISO: backend ainda não respondeu. Veja: $ROOT/.local-data/logs/backend.log"
else
  echo "Backend OK em http://127.0.0.1:3000"
fi

echo ">>> Iniciando frontend React (porta 5173)..."
pkill -f "frontend-react.*vite" 2>/dev/null || true
cd "$ROOT/frontend-react"
# VITE_FORCE=1 limpa cache do Vite e usa --force (mais lento e pesado; só se precisar)
VITE_ARGS=()
if [ "${VITE_FORCE:-0}" = "1" ]; then
  rm -rf "$ROOT/frontend-react/node_modules/.vite"
  VITE_ARGS+=(--force)
fi
npm run dev -- "${VITE_ARGS[@]}" >> "$ROOT/.local-data/logs/frontend-react.log" 2>&1 &
sleep 4

echo ""
echo "=== IZING rodando! ==="
echo "Frontend: http://localhost:5173"
echo "          (popups do sistema funcionam em localhost sem SSL)"
echo "HTTPS dev: cd frontend-react && npm run dev:https"
echo "          (use se acessar pelo IP da rede; aceite o certificado no navegador)"
echo "Backend:  http://localhost:3000"
echo "Login:    admin@izing.io / 123456"
echo ""
echo "Logs: $ROOT/.local-data/logs/"
echo "Parar: pkill -f 'ts-node-dev.*server.ts'; pkill -f 'frontend-react.*vite'"
