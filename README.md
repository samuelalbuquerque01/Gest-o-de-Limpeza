# Gestao de Limpeza

Sistema web para gestao de limpeza com:
- autenticacao por perfil (ADMIN e CLEANER)
- gerenciamento de ambientes
- execucao de limpeza com checklist
- leitura e geracao de QR Code
- dashboard e relatorios

Stack principal:
- Frontend: React + MUI (`Front/`)
- Backend: Node.js + Express + Prisma + PostgreSQL (`Backend/`)

## Visao Geral

O fluxo principal e:
1. Admin cadastra ambientes e equipe.
2. Cada ambiente possui um QR Code.
3. Worker escaneia QR e inicia limpeza.
4. Worker conclui com checklist.
5. Sistema atualiza status, historico e dashboards.

## Perfis e Permissoes

- `ADMIN`
  - gerencia usuarios/funcionarios
  - CRUD de ambientes
  - geracao/download de QR de ambientes
  - acesso a dashboard admin e relatorios
- `CLEANER`
  - login de worker
  - visualiza ambientes disponiveis
  - inicia/conclui/cancela limpeza
  - consulta suas limpezas do dia e limpeza ativa

## Funcionalidades

### 1) Autenticacao
- Login admin: `/api/auth/login`
- Login worker: `/api/auth/worker/login`
- Sessao/perfil atual: `/api/auth/me`
- Guard de rotas no frontend via `PrivateRoute` + `AuthContext`

### 2) Ambientes (Rooms)
- Listagem e filtros (status, tipo, busca)
- Criar, editar e excluir ambiente (admin)
- Estatisticas por status
- Ambientes disponiveis para limpeza (`PENDING` e `NEEDS_ATTENTION`)
- QR por ambiente (status, gerar novo, gerar em lote)

### 3) Limpezas
- Iniciar limpeza
- Concluir limpeza com checklist obrigatorio por tipo de ambiente
- Cancelar limpeza
- Historico de limpezas
- Limpezas ativas
- Estatisticas por periodo

### 4) QR Code
- Escanear QR para localizar ambiente
- Validar QR
- Gerar QR de ambiente
- Download de QR de ambiente
- Geracao em lote e relatorio de QR

### 5) Dashboard e Relatorios
- Dashboard operacional com:
  - total de ambientes
  - pendentes
  - em andamento
  - concluidos
  - precisa atencao
- Relatorios de limpeza com filtro e exportacao CSV

### 6) Keepalive (Render)
- Workflow em `.github/workflows/render-keepalive.yml`
- Ping automatico no endpoint de health para reduzir cold start no plano free

## Estrutura do Projeto

```txt
.
|-- Backend/
|   |-- prisma/schema.prisma
|   |-- src/
|   |   |-- app.js
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- routes/
|   |   `-- utils/
|   `-- server.js
|-- Front/
|   `-- src/
|       |-- App.js
|       |-- components/
|       |-- contexts/
|       |-- pages/
|       `-- services/
`-- .github/workflows/render-keepalive.yml
```

## Rotas Frontend (principais)

- Publicas:
  - `/`
  - `/scan`
  - `/qr/redirect`
  - `/admin/login`
  - `/worker/login`
- Privadas (ADMIN/CLEANER/SUPERVISOR):
  - `/dashboard`
  - `/rooms`
  - `/history`
  - `/settings`
- Privadas (ADMIN):
  - `/admin/dashboard`
  - `/admin/workers`
  - `/admin/reports`

## API Backend (resumo)

Base: `/api`

- Auth
  - `POST /auth/login`
  - `POST /auth/worker/login`
  - `GET /auth/me`
- Rooms
  - `GET /rooms`
  - `GET /rooms/stats`
  - `GET /rooms/available`
  - `GET /rooms/:id`
  - `GET /rooms/qr/:qrCode`
  - `POST /rooms`
  - `PUT /rooms/:id`
  - `DELETE /rooms/:id`
  - `POST /rooms/:id/generate-qr`
  - `GET /rooms/:id/qr-status`
  - `POST /rooms/generate-all-qr`
- Cleaning
  - `GET /cleaning/my/today`
  - `GET /cleaning/my/active`
  - `POST /cleaning/start`
  - `POST /cleaning/complete`
  - `POST /cleaning/cancel`
  - `GET /cleaning/today`
  - `GET /cleaning/history`
  - `GET /cleaning/active`
  - `GET /cleaning/recent`
  - `GET /cleaning/stats`
- Users (admin)
  - `GET /users`
  - `POST /users`
  - `PUT /users/:id`
  - `DELETE /users/:id`
  - `GET /users/stats`
  - `GET /users/:id/stats`
  - `GET /users/:id/login-history`
  - `GET /users/:id/performance`
- Reports
  - `GET /reports/summary`
  - `GET /reports/cleanings`
  - `GET /reports/export`
- QR
  - `POST /qr/validate`
  - `POST /qr/generate/:roomId`
  - `GET /qr/download/:roomId`
  - `POST /qr/generate-batch`
  - `POST /qr/generate-missing`
  - `GET /qr/report`
  - `GET /qr/health`

Health:
- `GET /api/health`

## Banco de Dados

Prisma + PostgreSQL.

Modelos principais:
- `User`
- `Room`
- `CleaningRecord`
- `Report`

Arquivo: `Backend/prisma/schema.prisma`

## Como Rodar Local

## 1) Requisitos
- Node.js 18+
- PostgreSQL
- npm

## 2) Backend

```bash
cd Backend
npm install
```

Crie/ajuste variaveis em `Backend/.env` (base em `Backend/.env.example`):
- `PORT`
- `DATABASE_URL`
- `DIRECT_URL` (quando usar migrations com Prisma em banco gerenciado)
- `JWT_SECRET`
- `FRONTEND_URL`

Depois:

```bash
npx prisma generate
npx prisma migrate deploy
npm run start
```

Backend sobe em: `http://localhost:5000`

## 3) Frontend

```bash
cd Front
npm install
npm start
```

Frontend sobe em: `http://localhost:3000` (ou porta disponivel)

## Build

Frontend:

```bash
cd Front
npm run build
```

Backend:

```bash
cd Backend
npm run start
```

## Deploy (Render)

### Backend
- Start command: `node server.js`
- Variaveis obrigatorias:
  - `DATABASE_URL`
  - `DIRECT_URL` (se aplicavel)
  - `JWT_SECRET`
  - `FRONTEND_URL`
  - `PORT` (Render injeta automaticamente)

### Frontend
- Build command: `npm run build`
- Ajustar URL da API no frontend, se necessario.

### Keepalive no GitHub Actions

Workflow: `.github/workflows/render-keepalive.yml`

Secret recomendado no GitHub:
- `RENDER_HEALTH_URL=https://SEU-SERVICO.onrender.com/api/health`

Triggers atuais:
- `schedule` (cron)
- `workflow_dispatch`
- `push` na `main`

## Observacoes Importantes

- O sistema usa JWT e controle por role.
- Em plano free do Render, pode haver cold start sem keepalive.
- Algumas mensagens de log no projeto estao com encoding misto (nao afeta regra de negocio).
- A pagina `/admin/workers` foi simplificada: sem exibicao de ID curto, sem acao de QR de funcionario e sem reset de senha pela UI.

## Troubleshooting Rapido

- Dashboard pendentes divergente de Rooms:
  - validar `GET /api/rooms/stats` e campo `stats.byStatus.PENDING`
- `401` em endpoints protegidos:
  - verificar token no `Authorization: Bearer <token>`
- CORS:
  - revisar `Backend/src/app.js` (`allowedOrigins`)
- Prisma:
  - rodar `npx prisma generate` apos atualizar schema

## Licenca

Projeto interno/privado. Ajuste conforme sua politica.
