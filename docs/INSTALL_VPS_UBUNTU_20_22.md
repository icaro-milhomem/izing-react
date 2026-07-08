# Manual de Instalação do IZING na VPS (Ubuntu 20/22)

> **Versão do projeto:** frontend React + backend Node.js · WhatsApp **somente Baileys** (wwebjs, Wuzapi e Chrome **removidos**).

### Arquitetura (modelo recomendado)

| Componente | Como roda |
|------------|-----------|
| **PostgreSQL, Redis** | Docker (containers) — **obrigatório** |
| **RabbitMQ** | Docker — **opcional** (só WABA360 / Messenger; **não** precisa para WhatsApp Baileys) |
| **Backend (API + WhatsApp)** | Node.js nativo via **PM2** — motor WhatsApp: **Baileys** (`@whiskeysockets/baileys`) |
| **Frontend React** | Build estático + **PM2** (`serve`) ou Nginx |
| **Portainer** | Docker (opcional, só para gerenciar containers) |

O backend e o frontend **não** entram em Docker neste modelo. O Docker serve apenas para a infraestrutura de dados/filas.

**WhatsApp:** o código usa **apenas Baileys**. Não há fallback para `whatsapp-web.js` nem Wuzapi. **Chrome não é necessário** para conectar WhatsApp.

### Observações

- Antes de começar, crie os subdomínios e aponte-os para o IP da VPS.
- Testado em Ubuntu 20 e 22.
- Docker **somente** para PostgreSQL e Redis (RabbitMQ opcional).
- Senha padrão deste manual: `123@mudar` — **altere em produção**.
- Domínio frontend: `izing.seusite.com.br`
- Domínio backend: `backend.seusite.com.br`
- **Primeiro acesso:** após instalar, acesse `https://izing.seusite.com.br/auth/setup` para criar empresa e usuário admin (não existe login padrão pré-criado).
1. Alterando para root

```bash
sudo su root
```

2. Setar Time Zone para São Paulo e atualizar sistema

```bash
timedatectl set-timezone America/Sao_Paulo && apt update && apt upgrade -y
```

3. Reiniciar para atualizar kernel

```bash
reboot
```

4. Apos reniciar conectar no servidor novamente - Alterando para root

```bash
sudo su root
```

5. Instalar pacotes necessários

```bash
apt install -y ffmpeg fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
  apt-transport-https ca-certificates software-properties-common curl wget unzip \
  build-essential nginx fontconfig locales
```

> **Nota:** pacotes gráficos/Chrome (`libxss1`, `libgbm-dev`, `google-chrome-stable`, etc.) **não são mais necessários** — o WhatsApp usa Baileys, sem navegador headless.
6. Adicionar repositorio Docker

```bash
# Add Docker's official GPG key:
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
```

7. Instalar docker

```bash
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

8. limpar pacotes não são mais usados

```bash
apt autoremove -y
```

9. Subir infraestrutura no Docker

**Opção A — docker compose (recomendado):**

```bash
cd ~/izing-react
export IZING_DATA_DIR=/data
mkdir -p /data/pg /data/redis
docker compose -f docker-compose.infra.yml up -d
# Portainer (opcional):
# docker compose -f docker-compose.infra.yml --profile tools up -d
# RabbitMQ (só se usar WABA360 ou Messenger):
# docker compose -f docker-compose.infra.yml --profile rabbitmq up -d
```

**Opção B — containers individuais:**

```bash
docker run --name postgresql -e POSTGRES_USER=izing -e POSTGRES_PASSWORD=123@mudar -e TZ="America/Sao_Paulo" -p 5432:5432 --restart=always -v /data/pg:/var/lib/postgresql/data -d postgres:14
```

10. Instalar Redis no Docker

```bash
docker run --name redis-izing -e TZ="America/Sao_Paulo" -p 6379:6379 --restart=always -d redis:alpine redis-server --appendonly yes --requirepass "123@mudar"
```

11. Instalar Rabbitmq no Docker **(opcional — pule se só usar WhatsApp Baileys)**

```bash
docker compose -f docker-compose.infra.yml --profile rabbitmq up -d
```

Ou container avulso:

```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 --restart=always --hostname rabbitmq -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=123@mudar -v /data/rabbitmq:/var/lib/rabbitmq rabbitmq:3-management-alpine
```

> Se usou a **Opção A** sem profile `rabbitmq`, ignore este passo.

12. Instalar Portainer no Docker (opcional)

```bash
docker run -d --name portainer -p 9000:9000 -p 9443:9443 --restart=always -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data portainer/portainer-ce
```

13. ~~Instalar Google Chrome~~ — **PULAR**

> Com Baileys, **não instale Chrome**. Os passos 13–16 da versão antiga do manual foram removidos de propósito.

14. Remover arquivo padrão do nginx

```bash
sudo rm /etc/nginx/sites-enabled/default
```

15. Criar o usuário deploy

```bash
adduser deploy
```

16. Permissão sudo deploy
```bash
usermod -aG sudo deploy
```

17. Permissão docker deploy
```bash
usermod -aG docker deploy
```

18. Alterar para o novo usuário

```bash
su deploy
```

19. Realizar o download do Node.js 22.x

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
```

20. Instalar o Node.js

```bash
sudo apt-get install -y nodejs
```

21. Verificar versões do Node e npm

```bash
node --version
npm --version
```

22. Acessar o diretório raiz

```bash
cd ~
```

23. Baixar o repositório

```bash
git clone https://github.com/ldurans/izing.io.git izing-react
cd izing-react
```

> Se já tiver o código na VPS (upload/rsync), pule o `git clone` e use o diretório existente.

24. Criar o `.env` do backend

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

O `backend/.env.example` já traz o modelo completo (Baileys, Postgres, Redis, JWT, etc.). Em produção, ajuste `NODE_ENV`, URLs e gere JWT únicos no passo 25.

25. Gerar JWT (execute **duas vezes** e guarde os valores)

```bash
openssl rand -base64 32
```

26. Ajustes para **produção** no `backend/.env`

Se copiou do `.env.example` (valores de dev), altere pelo menos:

```bash
NODE_ENV=production
BACKEND_URL=https://backend.seusite.com.br
FRONTEND_URL=https://izing.seusite.com.br
JWT_SECRET=<valor do passo 25>
JWT_REFRESH_SECRET=<valor do passo 25>
```

Modelo de referência (produção):

```bash
# ambiente
NODE_ENV=production

# WhatsApp — somente Baileys (obrigatório; não há outro motor)
USE_BAILEYS=true
# BAILEYS_LOG_LEVEL=silent
# CHECK_INTERVAL=10000
# BAILEYS_VERBOSE=false
# LOG_LEVEL=info

# URL do backend (hooks, mídia, etc.)
BACKEND_URL=https://backend.seusite.com.br

# URL do frontend (CORS)
FRONTEND_URL=https://izing.seusite.com.br

# Porta do proxy reverso (Nginx com SSL)
PROXY_PORT=443

# Porta que o backend escuta
PORT=3000

# PostgreSQL
DB_DIALECT=postgres
DB_TIMEZONE=-03:00
DB_PORT=5432
POSTGRES_HOST=localhost
POSTGRES_USER=izing
POSTGRES_PASSWORD=123@mudar
POSTGRES_DB=postgres

# JWT (gere com: openssl rand -base64 32)
JWT_SECRET=COLE_AQUI
JWT_REFRESH_SECRET=COLE_AQUI

# Redis
IO_REDIS_SERVER=localhost
IO_REDIS_PORT=6379
IO_REDIS_DB_SESSION=2
IO_REDIS_PASSWORD=123@mudar

# Delays aleatórios (envio de mensagens / bot)
MIN_SLEEP_BUSINESS_HOURS=10000
MAX_SLEEP_BUSINESS_HOURS=20000
MIN_SLEEP_AUTO_REPLY=4000
MAX_SLEEP_AUTO_REPLY=6000
MIN_SLEEP_INTERVAL=2000
MAX_SLEEP_INTERVAL=5000

# RabbitMQ — comente AMQP_URL se usar SOMENTE WhatsApp Baileys
# RABBITMQ_DEFAULT_USER=admin
# RABBITMQ_DEFAULT_PASS=123@mudar
# AMQP_URL=amqp://admin:123@mudar@localhost:5672?connection_attempts=5&retry_delay=5

# API 360dialog (WABA — opcional)
API_URL_360=https://waba-sandbox.360dialog.io

# Domínio admin (super usuário)
ADMIN_DOMAIN=izing.io

# Facebook / Messenger (opcional)
VUE_FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET_KEY=

# Limites
USER_LIMIT=99
CONNECTIONS_LIMIT=99
```

> Referência completa com comentários de dev: `backend/.env.example`  
> Exemplo com Docker local: `backend/.env.docker.exemple`  
> **Removido do projeto:** `CHROME_BIN`, `USE_WUZAPI`, `WWEB_VERSION`, `WEB_VERSION`, pastas `.wwebjs_auth` e `.wwebjs_cache`.

27. Editar o `.env` do backend

```bash
nano ~/izing-react/backend/.env
```

28. Entrar na pasta do backend

```bash
cd ~/izing-react/backend
```

29. Instalar dependências

```bash
npm install --force
```

30. Build do backend

```bash
npm run build
```

31. Reiniciar containers de infraestrutura (Docker)

```bash
docker compose -f ~/izing-react/docker-compose.infra.yml restart
# ou, se usou docker run:
docker container restart postgresql redis-izing
docker container restart rabbitmq 2>/dev/null || true
docker container restart portainer 2>/dev/null || true
```

32. Criar tabelas no banco

```bash
npx sequelize db:migrate
```

33. Seeds do banco

```bash
npx sequelize db:seed:all
```

> O admin **não** é criado pelo seed. Na primeira visita ao frontend use **`/auth/setup`**.

34. Instalar PM2

```bash
sudo npm install -g pm2
```

**Atalho (build + migrate + PM2 em um comando):**

Na raiz do repositório, após configurar `backend/.env` e `frontend-react/.env`:

```bash
bash start-prod.sh
```

Variáveis úteis:

| Variável | Efeito |
|----------|--------|
| `SKIP_BUILD=1` | Só reinicia PM2 + migrate (sem rebuild) |
| `FRONTEND_PORT=4444` | Porta do frontend estático (padrão 4444) |
| `SKIP_RABBITMQ=1` | Padrão — não exige RabbitMQ (WhatsApp Baileys) |
| `SKIP_RABBITMQ=0` | Exige RabbitMQ ativo (WABA / Messenger) |

35. Iniciar backend com PM2 *(se não usou `start-prod.sh`)*

```bash
pm2 start dist/server.js --name izing-backend
```

37. Gerar Startup

```bash
pm2 startup ubuntu -u deploy
```

38. Gerar status parte 2

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup ubuntu -u deploy --hp /home/deploy
```

39. Acessando o frontend

```bash
cd ../frontend-react
```

40. copiando .env do example

```bash
cp .env.example .env
```

41. Editando o arquivo .env com o comando abaixo e prencher com os dados do item 42. Para salvar se usa Ctrl + x

```bash
nano .env
```

42. Dados env frontend

```bash
VITE_API_URL='https://backend.seusite.com.br'
```

43. Instalando as dependências
```bash
npm ci
```

44. Buildando o frontend
```bash
npm run build
```

45. Instalando serve (servidor estático)
```bash
npm install -g serve
```

46. Iniciando o frontend com PM2 *(ou use `start-prod.sh`, que chama `scripts/serve-frontend.sh`)*

```bash
pm2 start /home/deploy/izing-react/scripts/serve-frontend.sh --name izing-frontend --interpreter bash
```

Alternativa manual:

```bash
pm2 start "serve -s dist -l 4444" --name izing-frontend --cwd /home/deploy/izing-react/frontend-react
```
47. Salvando os serviços iniciados pelo PM2

```bash
pm2 save
```

48. Listar os serviços iniciados pelo PM2

```bash
pm2 list
```

52. Editar os dados abaixo com a URL que será usada para acessar o frontend.

```bash
server {
  server_name izing.seusite.com.br;

  location / {
    proxy_pass http://127.0.0.1:4444;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
  }

}
```

53. Criar e editar o arquivo izing-frontend com o comando abaixo e prencher com os dados do item 52. Para salvar se usa Ctrl + x

```bash
sudo nano /etc/nginx/sites-available/izing-frontend
```

54. Editar os dados abaixo com a URL que será usada para acessar o backend.

```bash
server {
  server_name backend.seusite.com.br;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_cache_bypass $http_upgrade;
  }

}
```

55. Criar e editar o arquivo izing-frontend com o comando abaixo e prencher com os dados do item 54. Para salvar se usa Ctrl + x

```bash
sudo nano /etc/nginx/sites-available/izing-backend
```

56. Criar link simbólico para o arquivo izing-frontend

```bash
sudo ln -s /etc/nginx/sites-available/izing-frontend /etc/nginx/sites-enabled/
```


57. Criar link simbólico para o arquivo izing-backend

```bash
sudo ln -s /etc/nginx/sites-available/izing-backend /etc/nginx/sites-enabled/
```

58. Editar o arquivo de configuração do nginx com o comando abaixo e prencher com os dados do item 59. adicionar antes# server_tokens off;. Para salvar se usa Ctrl + x

```bash
sudo nano /etc/nginx/nginx.conf
```

59. adicionar antes# server_tokens off;

```bash
underscores_in_headers on;	
client_max_body_size 100M;
```

60. Testar as configurações do nginx

```bash
sudo nginx -t
```

61. Restartar o nginx

```bash
sudo service nginx restart
```

62. Instalar o suporte a pacotes Snap

```bash
  sudo apt-get install snapd
```

63. Instalar o pacote do notes

```bash
sudo snap install notes
```

64. Instalar o pacote do certbot(SSL)

```bash
sudo snap install --classic certbot
```

65. Gerar certificado

```bash
sudo certbot --nginx
```

66. reniciar serviços docker
```bash
docker container restart portainer
```

67. reniciar serviços docker
```bash
docker container restart postgresql
```

68. reniciar serviços docker
```bash
docker container restart redis-izing
```

69. Reiniciar RabbitMQ *(somente se instalou o profile rabbitmq)*

```bash
docker container restart rabbitmq
```

---

## Primeiro acesso

1. Acesse `https://izing.seusite.com.br/auth/setup`
2. Crie a **empresa** e o **usuário administrador**
3. Faça login e vá em **Sessões** para conectar o WhatsApp (QR Code)

> Não existe mais login fixo `admin@izing.io / 123456` em instalação limpa.

**Portainer (opcional):** `http://ip.da.vps:9000`

**Health check do backend:** `https://backend.seusite.com.br/health`

### Comandos úteis — reiniciar infraestrutura Docker

```bash
docker container restart postgresql redis-izing
docker container restart portainer 2>/dev/null || true
docker container restart rabbitmq 2>/dev/null || true
```

### Comandos úteis — PM2

```bash
pm2 list
pm2 logs
pm2 restart all
pm2 restart izing-backend
pm2 restart izing-frontend
```
## WhatsApp com Baileys

O IZING usa **exclusivamente Baileys** (`@whiskeysockets/baileys`) para WhatsApp. Não há `whatsapp-web.js`, Wuzapi nem Chrome.

O frontend continua igual: canal tipo `whatsapp`, QR Code e reconexão na tela **Sessões**.

### 1. Configuração no `.env`

```bash
USE_BAILEYS=true
```

Essa variável permanece no `.env` por compatibilidade; o código **sempre** usa Baileys (`getWhatsAppProvider()` → `"baileys"`).

Reinicie o backend após alterar outras variáveis:

```bash
cd ~/izing-react/backend
pm2 restart izing-backend
pm2 logs izing-backend
```

Procure nos logs:

```text
StartWhatsAppSession: <id> provider=baileys
initBaileys: starting session ...
```

### 2. Conectar a sessão no painel

1. Acesse o frontend → **Sessões** (ou **Canais**).
2. Crie uma conexão do tipo **whatsapp**.
3. Clique em **Conectar** e escaneie o **QR Code** no celular.
4. Aguarde o status **CONNECTED**.

Se migrou de uma instalação antiga com wwebjs: **Desconectar → apagar credenciais → Conectar → novo QR**.

### 3. Onde ficam as credenciais

```text
izing-react/backend/.baileys_auth/session-<whatsappId>/
```

- **Não apague** essa pasta com a sessão em uso.
- Para forçar novo QR:

```bash
cd ~/izing-react/backend
pm2 stop izing-backend
rm -rf .baileys_auth/session-<ID>
pm2 start izing-backend
```

Substitua `<ID>` pelo id da conexão (ex.: `2` → `.baileys_auth/session-2`).

### 4. Variáveis opcionais (Baileys)

```bash
BAILEYS_LOG_LEVEL=silent    # silent | info | debug
CHECK_INTERVAL=10000        # ms — fila de mensagens pendentes
LOG_LEVEL=info
BAILEYS_VERBOSE=false
MIN_SLEEP_INTERVAL=2000
MAX_SLEEP_INTERVAL=5000
```

### 5. Uso no dia a dia

| Ação | Como |
|------|------|
| Enviar / receber | Fluxo normal de atendimento |
| Desconectar | Sessões → Desconectar |
| Reconectar após queda | Conectar / novo QR se `TIMEOUT` ou `DISCONNECTED` |
| Importar agenda do celular | **Não suportado** no Baileys (funcionalidade desabilitada) |

### 6. Problemas comuns

| Sintoma | O que fazer |
|---------|-------------|
| Status não vira CONNECTED | Desconectar, apagar `.baileys_auth/session-<id>`, novo QR |
| QR não aparece | Reiniciar PM2, abrir Sessões, gerar novo QR |
| Não envia / não recebe | Confirmar CONNECTED e `provider=baileys` nos logs |
| Após `pm2 restart` perde sessão | Verificar se `.baileys_auth/session-<id>` existe no disco |
| Backend cai ao abrir o painel | Banco zerado com token antigo no navegador — limpar cache ou usar aba anônima |
| Quer usar wwebjs de novo | **Não suportado** nesta versão do projeto — use Baileys |

### 7. Desenvolvimento local (referência)

Na máquina de desenvolvimento:

```bash
bash start-dev.sh
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
# Setup:    http://localhost:5173/auth/setup
```

Logs: `.local-data/logs/backend.log` e `.local-data/logs/frontend-react.log`