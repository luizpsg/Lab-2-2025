# Sistema de Lista de Compras com Microsserviços

Aplicação demonstrativa construída em Node.js para a disciplina Lab-2 (2025). O projeto explora conceitos de arquitetura de microsserviços através de um ecossistema que expõe autenticação de usuários, catálogo de itens, listas de compras e um API Gateway com observabilidade básica e circuit breaker.

## Arquitetura e Componentes

- **API Gateway (`api-gateway`)**: entrada única do cliente, roteamento, logging, proxy para os serviços e endpoints agregados (`/api/dashboard`, `/api/search`). Implementa circuito aberto/fechado via `shared/serviceRegistry`.
- **User Service (`services/user-service`)**: registro, login, emissão/validação de JWT, CRUD limitado do perfil.
- **Item Service (`services/item-service`)**: catálogo completo de itens, filtros, busca avançada, estatísticas e operações CRUD autenticadas.
- **List Service (`services/list-service`)**: orquestra as listas de compras de cada usuário, sincronizando itens do catálogo e cálculos de resumo.
- **Shared (`shared/`)**: abstrações reutilizadas como o `JsonDatabase` (persistência em arquivos `.json`) e o `serviceRegistry` (descoberta, health-checks e circuit breaker).
- **Cliente demo (`client-demo.js`)**: roteiro automatizado que atravessa os principais fluxos pela API pública para fins de apresentação.

| Serviço      | Porta padrão | Função principal                 |
| ------------ | ------------ | -------------------------------- |
| API Gateway  | 3000         | Proxy, agregações e health geral |
| User Service | 3001         | Autenticação e perfis            |
| Item Service | 3002         | Catálogo de produtos             |
| List Service | 3003         | Listas de compras dos usuários   |

## Estrutura de Pastas

```
04c-microservices-trabalho/
├── api-gateway/
├── services/
│   ├── user-service/
│   ├── item-service/
│   └── list-service/
├── shared/
├── client-demo.js
├── package.json
└── README.md
```

Cada serviço possui seu próprio `package.json` e diretório `data/` onde os arquivos `.json` são criados automaticamente após o primeiro uso.

## Pré-requisitos

- Node.js 18+ (testado com 18.x) e npm
- Portas 3000–3003 livres para os microsserviços
- Instância RabbitMQ 3.x acessível (padrão `amqp://localhost`)

## Instalação

```bash
# Na raiz do repositório
npm run install:all
```

Esse script faz `npm install` na raiz (para scripts compartilhados) e, em seguida, em cada serviço e no gateway.

## Execução

### Subindo todos os serviços

```bash
npm run start:all
```

O comando usa `concurrently` para iniciar User, Item, List e API Gateway de uma vez. Aguarde até que todos registrem os logs `running on port ...` e que o `api-gateway` mostre os serviços registrados.

### Subindo manualmente (opcional)

```bash
# Em terminais separados
npm run start:user
npm run start:item
npm run start:list
npm run start:gateway
```

### Rodando a demonstração interativa

Após os serviços e os consumers de mensageria estarem de pé:

```bash
npm run demo
```

O script `client-demo.js` executa:

1. Health-check do gateway
2. Registro automático de usuário e login
3. Consulta ao catálogo e buscas
4. Criação de lista e gerenciamento de itens
5. Checkout assíncrono (`POST /api/lists/:id/checkout`)
6. Resumo, dashboard e busca global

O terminal dos consumers exibirá os logs exigidos no roteiro de mensageria.

## Scripts úteis

| Script                  | Descrição                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `npm run install:all`   | Instala dependências na raiz, serviços e gateway                                      |
| `npm run start:all`     | Sobe todos os microsserviços e o gateway em paralelo                                  |
| `npm run workers:start` | Sobe os dois consumers (Log e Analytics) do RabbitMQ                                  |
| `npm run demo`          | Executa o cliente demonstrativo (`client-demo.js`)                                    |
| `npm run clean`         | Remove arquivos `.json` de dados e o `shared/registry.json` para reiniciar o ambiente |

## Persistência e Reset

- Cada serviço escreve seus dados em `services/<service>/data/<collection>.json`.
- O registro de serviços fica em `shared/registry.json`.
- Use `npm run clean` para apagar todos os dados e iniciar do zero (ideal para repetir a demo).

## Configurações e Variáveis

- `PORT`: cada serviço aceita a porta via `process.env.PORT`; por padrão 3000–3003.
- `JWT_SECRET` (User Service): default `your-secret-key-change-in-production`. Defina via variável de ambiente antes de iniciar o serviço para ambientes reais.
- `RABBITMQ_URL`: URL de conexão (default `amqp://localhost`).
- `RABBITMQ_EXCHANGE`: nome do exchange (default `shopping_events`).
- URLs e hosts são definidos no momento do registro no `ServiceRegistry` (assumindo `localhost`).

## Mensageria com RabbitMQ

Para atender ao roteiro “Finalização de Compra”:

1. **Producer (`list-service`)**
   - Endpoint `POST /api/lists/:id/checkout` responde **202 Accepted**.
   - Publica o payload da lista no exchange `shopping_events` com routing key `list.checkout.completed`.
2. **Consumer A – Log/Notification (`workers/log-consumer.js`)**
   - Fila `log_notification_queue` (`binding: list.checkout.#`).
   - Loga `Enviando comprovante da lista [ID] para o usuário [EMAIL]`.
3. **Consumer B – Analytics (`workers/analytics-consumer.js`)**
   - Fila `analytics_queue` (`binding: list.checkout.#`).
   - Calcula o total estimado e simula atualização de dashboard.

Execução recomendada em terminais separados:

```bash
# RabbitMQ rodando local (docker run, instalação nativa etc.)
npm run start:all          # Serviços HTTP
npm run workers:start      # Consumers Log + Analytics
npm run demo               # Dispara o fluxo completo
```

Use o RabbitMQ Management UI para acompanhar a criação do exchange, filas e o consumo das mensagens (volume sobe durante o checkout e zera após os ACKs).

## Endpoints principais (via Gateway)

- **Autenticação**: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/verify`
- **Usuários**: `/api/users/:id` para buscar/atualizar o próprio perfil (necessário `Authorization: Bearer <token>`).
- **Catálogo**:
  - `GET /api/items` com suporte a filtros (`category`, `brand`, `search`, paginação, ordenação)
  - `GET /api/items/:id` e `GET /api/items/barcode/:barcode`
  - `GET /api/categories`, `GET /api/brands`, `GET /api/items/search`, `GET /api/stats`
  - Operações autenticadas: `POST /api/items`, `PUT /api/items/:id`, `DELETE /api/items/:id`, `POST /api/items/bulk`
- **Listas**:
  - `GET /api/lists`, `POST /api/lists`
  - `GET/PUT/DELETE /api/lists/:id`
  - `POST /api/lists/:id/items`, `PUT /api/lists/:id/items/:itemId`, `DELETE /api/lists/:id/items/:itemId`
  - `GET /api/lists/:id/summary`
  - `POST /api/lists/:id/checkout` → dispara o evento assíncrono (RabbitMQ) e retorna 202
- **Agregações**:
  - `GET /api/dashboard` (requer token)
  - `GET /api/search?q=<texto>` e `/search?q=<texto>` (versão legada)
- **Observabilidade**:
  - `GET /health` (gateway + status dos serviços registrados)
  - `GET /registry` (dump completo do registro)

Para chamadas diretas aos serviços internos, use as portas individuais, mas o fluxo recomendado é sempre via gateway.

## Boas práticas e próximos passos

- Adapte `JWT_SECRET` e considere mover o armazenamento de dados para um banco real (MongoDB, Postgres, etc.) para produção.
- Adicione testes automatizados ou smoke tests que validem os principais endpoints.
- Containerize cada serviço para facilitar implantação (Docker Compose é um bom começo).

---

Sinta-se à vontade para explorar, ajustar e expandir este laboratório para novos cenários de microsserviços.
