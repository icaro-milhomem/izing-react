#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONDA="$HOME/miniconda3"
FRONTEND_PORT="${FRONTEND_PORT:-4444}"
BACKEND_PORT="${BACKEND_PORT:-3000}"
SKIP_BUILD="${SKIP_BUILD:-0}"
SKIP_RABBITMQ="${SKIP_RABBITMQ:-1}"

echo "=== IZING — Iniciando ambiente de produção (PM2) ==="

source "$CONDA/etc/profile.d/conda.sh" 2>/dev/null || true
export PATH="$CONDA/bin:$PATH"

if ! pg_isready -h localhost -p 5432 &>/dev/null 2>&1; then
  echo ">>> PostgreSQL não está rodando. Executando setup-local..."
  SKIP_RABBITMQ="$SKIP_RABBITMQ" bash "$ROOT/setup-local.sh"
fi

if ! redis-cli -a '123@mudar' ping &>/dev/null 2>&1; then
  echo "ERRO: Redis não responde em localhost:6379"
  exit 1
fi

if [ "$SKIP_RABBITMQ" != "1" ]; then
  if command -v rabbitmq-diagnostics &>/dev/null && rabbitmq-diagnostics -q ping &>/dev/null 2>&1; then
    echo "RabbitMQ: OK"
  elif docker ps --format '{{.Names}}' 2>/dev/null | grep -qx rabbitmq; then
    echo "RabbitMQ (Docker): OK"
  else
    echo "AVISO: SKIP_RABBITMQ=0 mas RabbitMQ não está ativo (necessário para WABA360/Messenger)."
  fi
else
  echo "RabbitMQ: ignorado (SKIP_RABBITMQ=1 — padrão para WhatsApp Baileys)"
fi

if ! command -v pm2 &>/dev/null; then
  echo ">>> Instalando PM2..."
  npm install -g pm2
fi

mkdir -p "$ROOT/.local-data/logs"

# Encerra processos de dev se estiverem rodando
pkill -f "ts-node-dev.*src/server.ts" 2>/dev/null || true
pkill -f "frontend-react.*vite" 2>/dev/null || true

export NODE_ENV=production

if [ "$SKIP_BUILD" != "1" ]; then
  echo ">>> Backend: build"
  cd "$ROOT/backend"
  npm run build

  echo ">>> Backend: migrate"
  npx sequelize db:migrate

  echo ">>> Frontend: build"
  cd "$ROOT/frontend-react"
  if [ ! -f .env ] && [ -f .env.example ]; then
    cp .env.example .env
    echo "AVISO: criado frontend-react/.env a partir do example — ajuste VITE_API_URL se necessário."
  fi
  npm run build
else
  echo ">>> SKIP_BUILD=1 — pulando npm run build"
  cd "$ROOT/backend"
  npx sequelize db:migrate
fi

pm2_start_or_restart() {
  local name="$1"
  shift
  if pm2 describe "$name" &>/dev/null; then
    pm2 delete "$name" &>/dev/null || true
  fi
  pm2 start "$@" --name "$name"
}

echo ">>> Iniciando backend (porta $BACKEND_PORT)..."
cd "$ROOT/backend"
pm2_start_or_restart izing-backend dist/server.js \
  --cwd "$ROOT/backend" \
  --env production \
  --max-memory-restart 512M

echo ">>> Iniciando frontend estático (porta $FRONTEND_PORT)..."
export FRONTEND_PORT
chmod +x "$ROOT/scripts/serve-frontend.sh"
pm2_start_or_restart izing-frontend "$ROOT/scripts/serve-frontend.sh" \
  --interpreter bash

BACKEND_OK=0
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -sf "http://127.0.0.1:${BACKEND_PORT}/health" -o /dev/null 2>/dev/null; then
    BACKEND_OK=1
    break
  fi
  sleep 2
done

pm2 save 2>/dev/null || true

echo ""
echo "=== IZING produção rodando! ==="
echo "Frontend: http://localhost:${FRONTEND_PORT}"
echo "Backend:  http://localhost:${BACKEND_PORT}"
echo "Health:   http://localhost:${BACKEND_PORT}/health"
echo ""
echo "PM2:  pm2 list | pm2 logs | pm2 restart all"
echo "Parar: pm2 stop izing-backend izing-frontend"
echo ""
echo "Variáveis úteis:"
echo "  SKIP_BUILD=1 bash start-prod.sh     # só reinicia PM2 + migrate"
echo "  SKIP_RABBITMQ=0 bash start-prod.sh  # exige RabbitMQ (WABA/Messenger)"
echo "  FRONTEND_PORT=8080 bash start-prod.sh"

if [ "$BACKEND_OK" -eq 0 ]; then
  echo ""
  echo "AVISO: backend ainda não respondeu em /health. Veja: pm2 logs izing-backend"
  exit 1
fi
