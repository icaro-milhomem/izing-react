# IZING — Frontend

Interface web do IZING em **React + Vite + MUI + Zustand + TanStack Query**.

## Desenvolvimento

```bash
bash start-dev.sh
# ou
cd frontend-react && npm run dev
```

Em dev a API usa automaticamente o mesmo host da página + porta 3000 (funciona com IP WSL).

**Primeira instalação:** acesse o frontend — se não houver usuários, você será redirecionado para `/primeiro-acesso`.

**Já configurado:** faça login com a conta criada na configuração inicial.

## Stack

- React 19 + TypeScript + Vite
- MUI 9, React Router (HashRouter)
- Zustand, TanStack Query, Socket.io v3
- React Flow (Chat Flow), ApexCharts (Dashboard)
- PWA (`vite-plugin-pwa`)

## Build produção

```bash
cd frontend-react
cp .env.example .env   # VITE_API_URL=https://backend.seusite.com.br
npm ci
npm run build
```

Artefatos em `frontend-react/dist/`.

### Docker

```bash
docker build -t izingopenio/izingopenio-frontend:latest ./frontend-react
```

CI: `.github/workflows/docker-frontend-image.yml` publica `izingopenio/izingopenio-frontend:latest`.

### Servidor estático (PM2)

```bash
npm install -g serve
pm2 start "serve -s dist -l 4444" --name izing-frontend --cwd /caminho/frontend-react
```

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL do backend (obrigatório em produção) |
| `VITE_API_PORT` | Porta do backend em dev (padrão: 3000) |
