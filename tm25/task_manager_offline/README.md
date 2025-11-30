# Task Manager Offline-First

Aplicativo Flutter com suporte completo a operação offline, fila de sincronização
e resolução de conflitos Last-Write-Wins.

O repositório agora contém **dois componentes**:

1. `lib/` – aplicativo Flutter (Android/iOS/Web)
2. `backend/` – API REST Node + Express usada para sincronização

## Requisitos

- Flutter 3.x
- Node.js ≥ 18
- Emulador ou dispositivo físico Android/iOS

## Como rodar

### 1. Backend (porta 3000)

```bash
cd backend
npm install
npm run dev    # ou npm start
```

Endpoints disponíveis:

- `GET /api/health` – status do servidor
- `GET /api/tasks?userId=user1&modifiedSince=timestamp`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id?version=1`
- `POST /api/sync/batch` – processamento em lote da fila offline

Todos os dados ficam em `backend/data/db.json`.

### 2. Aplicativo Flutter

```bash
flutter pub get
flutter run
```

O app já aponta para `http://10.0.2.2:3000/api`, então basta manter o backend
rodando no host e executar o app no emulador (ou ajustar `ApiService.baseUrl`
para o endereço desejado).

## Roteiro de Demonstração (Offline-First.md)

1. Ative modo avião e crie/edite tarefas. Elas ficam salvas localmente com ícone
   de pendente.
2. Feche e reabra o app ainda offline para comprovar a persistência via SQLite.
3. Volte para o modo online: a sincronização automática envia a fila e atualiza
   o status para “sincronizado”.
4. Para conflito LWW, edite a mesma tarefa no servidor (ex.: via Postman) e no
   app. A versão com `updatedAt` mais recente vence.

## Estrutura do backend

- `src/index.js` – inicializa Express/CORS e registra as rotas
- `src/routes.js` – rotas REST, sync em lote e regras de conflito
- `src/store.js` – persistência simples em arquivo JSON
- `data/db.json` – banco de dados local (commitado para facilitar testes)

## Próximos passos

- Ajustar `ApiService.baseUrl` se o backend estiver em outro host/porta
- Adaptar o backend para um banco real (Mongo/Postgres) se necessário
- Adicionar autenticação/controle de usuários conforme a disciplina exigir
