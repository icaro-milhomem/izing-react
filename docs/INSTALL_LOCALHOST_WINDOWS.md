# Manual de Instação do izing.io localhost no windows

### Arquitetura (modelo recomendado)

| Componente | Como roda |
|------------|-----------|
| **PostgreSQL, Redis, RabbitMQ** | Docker Desktop (containers) |
| **Backend (API + WhatsApp Web)** | Node.js nativo via **PM2** |
| **Frontend React** | Build estático + **PM2** (`serve`) |

Backend e frontend **não** rodam em Docker — apenas a infraestrutura.

### Observação:
Site baixar docker para windows
https://docs.docker.com/desktop/install/windows-install/

Site baixar Node 18 para windows
https://nodejs.org/en/download

Link para baixar codigo izing
https://github.com/ldurans/izing.open.io/archive/refs/heads/master.zip

Link baixar Google Chrome:
https://www.google.com/intl/pt-BR/chrome/

Nesse exemplo estaremos colocando izing na pasta c:\izing
Instale programas, Docker, Node20 e google chrome
Descompactar conteudo do arquivo do codigo izing deixando dentro da pasta c:\izing
================================================

1. Abra o "Node.js command prompt"

2. Acessar pasta backend

```bash
cd c:\izing\backend
```

3. Instalando as dependências

```bash
npm install --force
```

4. renomear arquivo .env.example para .env na pasta c:\izing\backend e preencher conforme conteudo abaixo

```bash
#NODE_ENV=prod

# ambiente
NODE_ENV=dev

# URL do backend para construção dos hooks
BACKEND_URL=http://localhost:3000

# URL do front para liberação do cors
FRONTEND_URL=http://localhost:4444

# Porta utilizada para proxy com o serviço do backend
PROXY_PORT=3100

# Porta que o serviço do backend deverá ouvir
PORT=3000


# conexão com o banco de dados
DB_DIALECT=postgres
DB_TIMEZONE=-03:00
DB_PORT=5432
POSTGRES_HOST=localhost
POSTGRES_USER=izing
POSTGRES_PASSWORD=123@mudar
POSTGRES_DB=postgres


# Chaves para criptografia do token jwt
JWT_SECRET=DPHmNRZWZ4isLF9vXkMv1QabvpcA80Rc
JWT_REFRESH_SECRET=EMPehEbrAdi7s8fGSeYzqGQbV5wrjH4i

# Dados de conexão com o REDIS
IO_REDIS_SERVER=localhost
IO_REDIS_PORT='6379'
IO_REDIS_DB_SESSION='2'
IO_REDIS_PASSWORD=123@mudar

CHROME_BIN=c:\Program Files\Google\Chrome\Application\chrome.exe
#CHROME_BIN=/usr/bin/google-chrome-stable
#CHROME_BIN=null

# tempo para randomização da mensagem de horário de funcionamento
MIN_SLEEP_BUSINESS_HOURS=10000
MAX_SLEEP_BUSINESS_HOURS=20000

# tempo para randomização das mensagens do bot
MIN_SLEEP_AUTO_REPLY=4000
MAX_SLEEP_AUTO_REPLY=6000

# tempo para randomização das mensagens gerais
MIN_SLEEP_INTERVAL=2000
MAX_SLEEP_INTERVAL=5000


# dados do RabbitMQ / Para não utilizar, basta comentar a var AMQP_URL
RABBITMQ_DEFAULT_USER=admin
RABBITMQ_DEFAULT_PASS=123@mudar
AMQP_URL='amqp://admin:123@mudar@localhost:5672?connection_attempts=5&retry_delay=5'

# api oficial (integração em desenvolvimento)
API_URL_360=https://waba-sandbox.360dialog.io

# usado para mosrar opções não disponíveis normalmente.
ADMIN_DOMAIN=izing.io

# Dados para utilização do canal do facebook
VUE_FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET_KEY=
```

5. Subir infraestrutura no Docker (PostgreSQL, Redis, RabbitMQ)

**Opção A — docker compose (recomendado):**

Na pasta do projeto (ex.: `c:\izing`):

```bash
docker compose -f docker-compose.infra.yml up -d
```

**Opção B — containers individuais:**

```bash
docker run --name postgresql -e POSTGRES_USER=izing -e POSTGRES_PASSWORD=123@mudar -e TZ="America/Sao_Paulo" -p 5432:5432 --restart=always -v izing-pg:/var/lib/postgresql/data -d postgres:14
```

```bash
docker run --name redis-izing -e TZ="America/Sao_Paulo" -p 6379:6379 --restart=always -d redis:alpine redis-server --appendonly yes --requirepass "123@mudar"
```

```bash
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 --restart=always --hostname rabbitmq -e RABBITMQ_DEFAULT_USER=admin -e RABBITMQ_DEFAULT_PASS=123@mudar -v izing-rabbitmq:/var/lib/rabbitmq rabbitmq:3-management-alpine
```

6. Buildando o backend

```bash
npm run build
```

7. Criando as tabelas no BD (pasta backend)

```bash
npx sequelize db:migrate
```

8. Inserindo dados iniciais

```bash
npx sequelize db:seed:all
```

9. Acessar pasta frontend-react

```bash
cd c:\izing\frontend-react
```

10. renomear arquivo .env.example para .env e preencher:

```bash
VITE_API_URL='http://localhost:3000'
```

11. Instalando as dependências do frontend

```bash
npm ci
```

12. Buildando o frontend

```bash
npm run build
```

13. Instalando o PM2 e serve

```bash
npm install -g pm2 serve
```

14. Iniciando backend e frontend com PM2

```bash
cd c:\izing\backend
pm2 start dist/server.js --name izing-backend
pm2 start "serve -s dist -l 4444" --name izing-frontend --cwd c:\izing\frontend-react
```

15. Salvando os serviços iniciados pelo PM2

```bash
pm2 save
```

Reiniciar containers de infra (se necessário):

```bash
docker compose -f c:\izing\docker-compose.infra.yml restart
```

Pronto sistema instalado so acessar frontend

Acessar pela url:

http://localhost:4444/

Usuário padrão para acesso

Usuário

admin@izing.io  

Senha:

123456


Iniciar depois reniciar computador:

Abra o Docker Desktop espera carregar os serviços, exemplo docker serviços ativos

[<img src="dockerdesktop.png">](dockerdesktop.png)



Abra o "Node.js command prompt"

```bash
pm2 resurrect
```



Problemas conexão?

Abra o "Node.js command prompt"

Acessar pasta backend

```bash
cd c:\izing\backend
```

1. Outra versão js pode se tentar
Na pasta backend execute
```bash
npm r whatsapp-web.js
```
```bash
npm i whatsapp-web.js@^1.23.1-alpha.6
```
```bash
rm .wwebjs_auth -Rf
```
```bash
rm .wwebjs_cache -Rf
```
```bash
pm2 restart all
```

2. Versão ldurans
Na pasta backend execute
```bash
npm r whatsapp-web.js
```
```bash
npm install github:pedroslopez/whatsapp-web.js#webpack-exodus
```
```bash
rm .wwebjs_auth -Rf
```
```bash
rm .wwebjs_cache -Rf
```
```bash
pm2 restart all
```



Para reinstalar o whatsapp.js.. verifique no repositorio oficial se não tem alguma mais atual
