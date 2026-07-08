#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source ~/miniconda3/etc/profile.d/conda.sh 2>/dev/null || true
export PATH="$HOME/miniconda3/bin:$PATH"
export LD_LIBRARY_PATH="$HOME/miniconda3/lib:${LD_LIBRARY_PATH:-}"

echo ">>> Parando backend..."
pkill -f "ts-node-dev.*src/server.ts" 2>/dev/null || true
sleep 2

echo ">>> Limpando sessão WhatsApp (cache wwebjs)..."
rm -rf "$ROOT/backend/.wwebjs_auth" "$ROOT/backend/.wwebjs_cache"

echo ">>> Resetando status da conexão no banco..."
psql -h localhost -U izing -d postgres -c \
  "UPDATE \"Whatsapps\" SET status='DISCONNECTED', qrcode=NULL, retries=0, session='' WHERE id=1;" \
  2>/dev/null || true

echo ">>> Reiniciando backend..."
cd "$ROOT/backend"
npm run build
nohup npm run dev:server >> "$ROOT/.local-data/logs/backend.log" 2>&1 &
sleep 12

echo ">>> Pronto! No painel: Conexões → Iniciar sessão → escaneie o QR em até 20 segundos."
echo "    Se ainda falhar, edite a conexão, informe o número com DDI (ex: 5599999999999)"
echo "    e descomente USE_PAIRING_CODE=true no backend/.env"
