# Izing React

Plataforma de atendimento multicanal (WhatsApp, Hub, campanhas, chat interno, etc.).

## Estrutura

| Pasta | Descrição |
|-------|-----------|
| `backend/` | API Node.js + Sequelize + Socket.io |
| `frontend-react/` | Interface web (React) |
| `docs/` | Guias de instalação |

> O frontend Vue/Quasar (`frontend/`) foi removido. Use apenas `frontend-react/`.

## Infraestrutura (Docker)

PostgreSQL, Redis e RabbitMQ rodam em Docker. Backend e frontend rodam nativamente (PM2/Node).

```bash
docker compose -f docker-compose.infra.yml up -d
```

Credenciais padrão: Postgres `izing` / `123@mudar`, Redis senha `123@mudar`, RabbitMQ `admin` / `123@mudar`.

Ver guias completos em `docs/INSTALL_VPS_UBUNTU_20_22.md` e `docs/INSTALL_LOCALHOST_WINDOWS.md`.

## Desenvolvimento local

```bash
bash start-dev.sh
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- **Primeira instalação:** abra o frontend — cadastre empresa, usuário **Super** (SaaS) e **Admin** (atendimento) em `/primeiro-acesso`
- **Já configurado:** faça login com o e-mail e senha criados no primeiro acesso

## Produção

- Frontend: `frontend-react/` — build com `npm run build` ou imagem Docker `izingopenio/izingopenio-frontend:latest`
- Backend: `backend/` — ver `docs/INSTALL_VPS_UBUNTU_20_22.md`
