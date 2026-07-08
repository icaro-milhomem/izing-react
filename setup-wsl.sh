#!/bin/bash
set -euo pipefail

echo "=== IZING - Setup WSL (Docker + Chrome) ==="

if [ "$(id -u)" -ne 0 ]; then
  echo "Execute com sudo: sudo bash setup-wsl.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

apt-get install -y \
  curl wget gnupg ca-certificates ffmpeg \
  fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg \
  fonts-kacst fonts-freefont-ttf libxss1 libgbm-dev

# Docker
if ! command -v docker &>/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
    https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable main" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

# Google Chrome (Puppeteer/WhatsApp Web)
if ! command -v google-chrome-stable &>/dev/null; then
  wget -q -O - https://dl.google.com/linux/linux_signing_key.pub \
    | gpg --dearmor -o /usr/share/keyrings/chrome-keyring.gpg
  echo "deb [arch=amd64 signed-by=/usr/share/keyrings/chrome-keyring.gpg] \
    http://dl.google.com/linux/chrome/deb/ stable main" \
    > /etc/apt/sources.list.d/google.list
  apt-get update
  apt-get install -y google-chrome-stable
fi

# PM2 (gerenciador de processos)
if ! command -v pm2 &>/dev/null; then
  npm install -g pm2
fi

# Adicionar usuário ao grupo docker
if [ "$REAL_USER" != "root" ]; then
  usermod -aG docker "$REAL_USER"
fi

service docker start || systemctl start docker || true

REAL_USER="${SUDO_USER:-$USER}"
REAL_HOME=$(eval echo "~$REAL_USER")

# Liberar portas 5432/6379 se Miniconda estiver rodando
if [ -f "$REAL_HOME/miniconda3/etc/profile.d/conda.sh" ]; then
  source "$REAL_HOME/miniconda3/etc/profile.d/conda.sh"
  export PATH="$REAL_HOME/miniconda3/bin:$PATH"
  PGDATA="$REAL_HOME/izing-react/.local-data/pg"
  if [ -f "$PGDATA/PG_VERSION" ]; then
    pg_ctl -D "$PGDATA" stop -m fast 2>/dev/null || true
  fi
  redis-cli -a '123@mudar' shutdown 2>/dev/null || true
  sleep 2
fi

echo "=== Subindo PostgreSQL e Redis (Docker) ==="
DATA_DIR="$REAL_HOME/izing-data"
mkdir -p "$DATA_DIR/pg" "$DATA_DIR/redis"
if [ "${IZING_SKIP_RABBITMQ:-1}" != "1" ]; then
  mkdir -p "$DATA_DIR/rabbitmq"
fi
chown -R "$REAL_USER:$REAL_USER" "$DATA_DIR"

COMPOSE_FILE="$REAL_HOME/izing-react/docker-compose.infra.yml"
COMPOSE_PROFILES=()
if [ "${IZING_SKIP_RABBITMQ:-1}" != "1" ]; then
  COMPOSE_PROFILES+=(--profile rabbitmq)
fi

if [ -f "$COMPOSE_FILE" ]; then
  docker rm -f postgresql redis-izing rabbitmq 2>/dev/null || true
  IZING_DATA_DIR="$DATA_DIR" docker compose -f "$COMPOSE_FILE" "${COMPOSE_PROFILES[@]}" up -d
else
  docker rm -f postgresql redis-izing rabbitmq 2>/dev/null || true

  docker run --name postgresql \
    -e POSTGRES_USER=izing \
    -e POSTGRES_PASSWORD='123@mudar' \
    -e TZ=America/Sao_Paulo \
    -p 5432:5432 \
    --restart=always \
    -v "$DATA_DIR/pg:/var/lib/postgresql/data" \
    -d postgres:14

  docker run --name redis-izing \
    -e TZ=America/Sao_Paulo \
    -p 6379:6379 \
    --restart=always \
    -d redis:alpine \
    redis-server --appendonly yes --requirepass "123@mudar"

  if [ "${IZING_SKIP_RABBITMQ:-1}" != "1" ]; then
    docker run -d --name rabbitmq \
      -p 5672:5672 -p 15672:15672 \
      --restart=always \
      --hostname rabbitmq \
      -e RABBITMQ_DEFAULT_USER=admin \
      -e RABBITMQ_DEFAULT_PASS='123@mudar' \
      -v "$DATA_DIR/rabbitmq:/var/lib/rabbitmq" \
      rabbitmq:3-management-alpine
  fi
fi

echo "Aguardando PostgreSQL..."
for i in $(seq 1 30); do
  if docker exec postgresql pg_isready -U izing &>/dev/null; then
    echo "PostgreSQL pronto!"
    break
  fi
  sleep 2
done

echo ""
echo "=== Setup concluído! ==="
echo "Se foi adicionado ao grupo docker, faça logout/login ou: newgrp docker"
echo "Depois rode: bash $REAL_HOME/izing-react/start-dev.sh"
