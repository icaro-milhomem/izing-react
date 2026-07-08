#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONDA="$HOME/miniconda3"
DATA="$ROOT/.local-data"
CHROME_BIN="$HOME/.cache/puppeteer/chrome/linux-146.0.7680.31/chrome-linux64/chrome"

echo "=== IZING - Instalação completa (sem sudo) ==="

if [ ! -d "$CONDA" ]; then
  echo ">>> Instalando Miniconda..."
  wget -q https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/miniconda.sh
  bash /tmp/miniconda.sh -b -p "$CONDA"
  rm /tmp/miniconda.sh
fi

source "$CONDA/etc/profile.d/conda.sh"
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/main 2>/dev/null || true
conda tos accept --override-channels --channel https://repo.anaconda.com/pkgs/r 2>/dev/null || true

if ! conda list postgresql 2>/dev/null | grep -q postgresql; then
  echo ">>> Instalando PostgreSQL e Redis..."
  conda install -y -c conda-forge postgresql=14 redis-server
fi

# RabbitMQ só é necessário para WABA360 / Messenger (não para WhatsApp Baileys).
# Padrão: SKIP_RABBITMQ=1 (não instala nem inicia).
if [ "${SKIP_RABBITMQ:-1}" != "1" ]; then
  if ! conda list rabbitmq-server 2>/dev/null | grep -q rabbitmq-server; then
    echo ">>> Instalando RabbitMQ..."
    conda install -y -c conda-forge 'rabbitmq-server>=4.0'
  fi
fi

mkdir -p "$DATA/pg" "$DATA/redis" "$DATA/logs"
if [ "${SKIP_RABBITMQ:-1}" != "1" ]; then
  mkdir -p "$DATA/rabbitmq"
fi
export PATH="$CONDA/bin:$PATH"

# PostgreSQL
export PGDATA="$DATA/pg"
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  echo ">>> Inicializando PostgreSQL..."
  initdb -D "$PGDATA" --auth-local=trust --auth-host=trust
fi
if ! pg_isready -h localhost -p 5432 &>/dev/null; then
  echo ">>> Iniciando PostgreSQL..."
  pg_ctl -D "$PGDATA" -l "$DATA/logs/postgres.log" start -o "-p 5432"
  sleep 3
  psql -h localhost -p 5432 -d postgres -c "DO \$\$ BEGIN CREATE USER izing WITH PASSWORD '123@mudar' SUPERUSER; EXCEPTION WHEN duplicate_object THEN ALTER USER izing WITH PASSWORD '123@mudar'; END \$\$;" 2>/dev/null || true
fi

# Redis
if ! redis-cli -a '123@mudar' ping &>/dev/null 2>&1; then
  echo ">>> Iniciando Redis..."
  redis-server --daemonize yes \
    --dir "$DATA/redis" \
    --appendonly yes \
    --requirepass "123@mudar" \
    --port 6379 \
    --logfile "$DATA/logs/redis.log"
  sleep 1
fi

# RabbitMQ (opcional — WABA360 / Messenger)
if [ "${SKIP_RABBITMQ:-1}" != "1" ]; then
  if ! rabbitmq-diagnostics -q ping &>/dev/null 2>&1; then
    echo ">>> Iniciando RabbitMQ..."
    export RABBITMQ_MNESIA_BASE="$DATA/rabbitmq"
    export RABBITMQ_LOG_BASE="$DATA/logs"
    export RABBITMQ_DEFAULT_USER=admin
    export RABBITMQ_DEFAULT_PASS='123@mudar'
    rabbitmq-server -detached >> "$DATA/logs/rabbitmq.log" 2>&1 || true
    sleep 5
    rabbitmqctl add_user admin '123@mudar' 2>/dev/null || rabbitmqctl change_password admin '123@mudar' 2>/dev/null || true
    rabbitmqctl set_user_tags admin administrator 2>/dev/null || true
    rabbitmqctl set_permissions -p / admin ".*" ".*" ".*" 2>/dev/null || true
  fi
fi

# Chrome via Puppeteer (WhatsApp Web)
WRAPPER="$ROOT/scripts/chrome.sh"
mkdir -p "$ROOT/scripts"
if [ ! -f "$CHROME_BIN" ]; then
  echo ">>> Instalando Chrome (Puppeteer)..."
  export PUPPETEER_CACHE_DIR="$HOME/.cache/puppeteer"
  cd "$ROOT/backend"
  npx puppeteer browsers install chrome
  CHROME_BIN=$(find "$HOME/.cache/puppeteer" -name chrome -type f 2>/dev/null | head -1)
fi

# Dependências do Chrome (sem sudo)
if ! conda list nspr 2>/dev/null | grep -q nspr; then
  conda install -y -c conda-forge nspr nss alsa-lib
fi

cat > "$WRAPPER" << 'WRAPPER_EOF'
#!/bin/bash
export LD_LIBRARY_PATH="$HOME/miniconda3/lib:${LD_LIBRARY_PATH:-}"
exec "$(find "$HOME/.cache/puppeteer" -name chrome -type f 2>/dev/null | head -1)" "$@"
WRAPPER_EOF
chmod +x "$WRAPPER"
CHROME_BIN="$WRAPPER"

# PM2
if ! command -v pm2 &>/dev/null; then
  echo ">>> Instalando PM2..."
  npm install -g pm2
fi

# Atualizar CHROME_BIN no .env
if [ -f "$CHROME_BIN" ] && [ -f "$ROOT/backend/.env" ]; then
  if grep -q "^CHROME_BIN=" "$ROOT/backend/.env"; then
    sed -i "s|^CHROME_BIN=.*|CHROME_BIN=$CHROME_BIN|" "$ROOT/backend/.env"
  else
    echo "CHROME_BIN=$CHROME_BIN" >> "$ROOT/backend/.env"
  fi
fi

echo ""
echo "=== Instalação concluída ==="
pg_isready -h localhost -p 5432 && echo "PostgreSQL: OK"
redis-cli -a '123@mudar' ping 2>/dev/null && echo "Redis: OK"
if [ "${SKIP_RABBITMQ:-1}" != "1" ]; then
  rabbitmq-diagnostics -q ping 2>/dev/null && echo "RabbitMQ: OK" || echo "RabbitMQ: verifique $DATA/logs/rabbitmq.log"
else
  echo "RabbitMQ: ignorado (SKIP_RABBITMQ=1 — padrão para Baileys)"
fi
[ -f "$CHROME_BIN" ] && echo "Chrome:   OK ($CHROME_BIN)" || echo "Chrome:   pendente"
command -v pm2 &>/dev/null && echo "PM2:      OK" || echo "PM2:      pendente"
echo ""
echo "Para Docker + Google Chrome nativo (opcional, requer sudo):"
echo "  sudo bash $ROOT/setup-wsl.sh"
