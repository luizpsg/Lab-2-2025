# _Atividade Prática: Sistema de Lista de Compras com Microsserviços_

<div style="text-align: center; margin-bottom: 40px;">
  <img src="https://www.pucminas.br/institucional/PublishingImages/Paginas/brasao/brasao-pucminas-versao-2025.png" alt="PUC Minas" class="logo-puc" style="height: 80px; margin-right: 20px;">
  <img src="https://sbbd.org.br/2023/wp-content/uploads/sites/16/2023/08/assinatura_icei_COR_2023-edited.jpg" alt="ICEI" class="logo-icei" style="height: 80px; margin-left: 20px;">
</div>

**\*Laboratório de Desenvolvimento de Aplicações Móveis e Distribuídas**
**Instituto de Ciências Exatas e Informática (ICEI)**
**Pontifícia Universidade Católica de Minas Gerais\***

**\*Professores:** Artur Mol, Cleiton Tavares e Cristiano Neto\*

---

## _Objetivo_

_Desenvolver um sistema distribuído para gerenciamento de listas de compras utilizando arquitetura de microsserviços com API Gateway, Service Discovery e bancos NoSQL independentes._

## _Cenário_

_Você deve implementar um sistema que permita aos usuários criar e gerenciar suas listas de compras. O sistema será composto por três microsserviços independentes que se comunicam através de um API Gateway._

## _Arquitetura do Sistema_

### _Microsserviços a Implementar:_

1. **\*User Service** (porta 3001) - Gerenciamento de usuários\*
2. **\*List Service** (porta 3002) - Gerenciamento de listas de compras\*
3. **\*Item Service** (porta 3003) - Catálogo de itens/produtos\*
4. **\*API Gateway** (porta 3000) - Ponto único de entrada\*

### _Tecnologias Obrigatórias:_

- _Node.js + Express_
- _Banco NoSQL baseado em arquivos JSON_
- _Service Registry compartilhado_
- _Autenticação JWT_

## _PARTE 1: User Service_

### _Funcionalidades Necessárias:_

#### _Endpoints:_

- _`POST /auth/register` - Cadastro de usuário_
- _`POST /auth/login` - Login com email/username + senha_
- _`GET /users/:id` - Buscar dados do usuário_
- _`PUT /users/:id` - Atualizar perfil do usuário_

#### _Schema do Usuário:_

```json
{
  "id": "uuid",
  "email": "string",
  "username": "string",
  "password": "string (hash)",
  "firstName": "string",
  "lastName": "string",
  "preferences": {
    "defaultStore": "string",
    "currency": "string"
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### _Requisitos:_

- _Hash de senhas com bcrypt_
- _Geração de tokens JWT_
- _Validação de email único_
- _Middleware de autenticação_

## _PARTE 2: Item Service_

### _Funcionalidades Necessárias:_

#### _Endpoints:_

- _`GET /items` - Listar itens com filtros (categoria, nome)_
- _`GET /items/:id` - Buscar item específico_
- _`POST /items` - Criar novo item (requer autenticação)_
- _`PUT /items/:id` - Atualizar item_
- _`GET /categories` - Listar categorias disponíveis_
- _`GET /search?q=termo` - Buscar itens por nome_

#### _Schema do Item:_

```json
{
  "id": "uuid",
  "name": "string",
  "category": "string",
  "brand": "string",
  "unit": "string", // "kg", "un", "litro"
  "averagePrice": "number",
  "barcode": "string",
  "description": "string",
  "active": "boolean",
  "createdAt": "timestamp"
}
```

#### _Dados Iniciais:_

_Criar pelo menos 20 itens distribuídos nas categorias:_

- _Alimentos_
- _Limpeza_
- _Higiene_
- _Bebidas_
- _Padaria_

## _PARTE 3: List Service_

### _Funcionalidades Necessárias:_

#### _Endpoints:_

- _`POST /lists` - Criar nova lista_
- _`GET /lists` - Listar listas do usuário_
- _`GET /lists/:id` - Buscar lista específica_
- _`PUT /lists/:id` - Atualizar lista (nome, descrição)_
- _`DELETE /lists/:id` - Deletar lista_
- _`POST /lists/:id/items` - Adicionar item à lista_
- _`PUT /lists/:id/items/:itemId` - Atualizar item na lista_
- _`DELETE /lists/:id/items/:itemId` - Remover item da lista_
- _`GET /lists/:id/summary` - Resumo da lista (total estimado)_

#### _Schema da Lista:_

```json
{
  "id": "uuid",
  "userId": "string",
  "name": "string",
  "description": "string",
  "status": "active|completed|archived",
  "items": [
    {
      "itemId": "string",
      "itemName": "string", // cache do nome
      "quantity": "number",
      "unit": "string",
      "estimatedPrice": "number",
      "purchased": "boolean",
      "notes": "string",
      "addedAt": "timestamp"
    }
  ],
  "summary": {
    "totalItems": "number",
    "purchasedItems": "number",
    "estimatedTotal": "number"
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

#### _Regras de Negócio:_

- _Usuário só pode ver suas próprias listas_
- _Ao adicionar item, buscar dados no Item Service_
- _Calcular automaticamente totais estimados_
- _Permitir marcar itens como comprados_

## _PARTE 4: API Gateway_

### _Funcionalidades Necessárias:_

#### _Roteamento:_

- _`/api/auth/_` → User Service\*
- _`/api/users/_` → User Service\*
- _`/api/items/_` → Item Service\*
- _`/api/lists/_` → List Service\*

#### _Endpoints Agregados:_

- _`GET /api/dashboard` - Dashboard com estatísticas do usuário_
- _`GET /api/search?q=termo` - Busca global (listas + itens)_
- _`GET /health` - Status de todos os serviços_
- _`GET /registry` - Lista de serviços registrados_

#### _Recursos Obrigatórios:_

- _Service Discovery via arquivo compartilhado_
- _Circuit Breaker simples (3 falhas = abrir circuito)_
- _Health checks automáticos a cada 30 segundos_
- _Logs de requisições_

## _PARTE 5: Service Registry_

### _Implementação:_

_Utilizar a implementação baseada em arquivo do exemplo fornecido:_

```javascript
// shared/serviceRegistry.js
// Arquivo compartilhado para descoberta de serviços
// Registro automático na inicialização
// Health checks distribuídos
```

### _Funcionalidades:_

- _Registro automático de serviços_
- _Descoberta por nome de serviço_
- _Health checks periódicos_
- _Cleanup automático na saída_

## _ENTREGÁVEIS_

### _Código Fonte:_

- - 4 serviços funcionais (User, Item, List, Gateway)\*
- - Service Registry implementado\*
- - Bancos NoSQL com dados de exemplo\*
- - Scripts package.json para execução\*

### _Estrutura de Diretórios:_

```
lista-compras-microservices/
├── package.json
├── shared/
│   ├── JsonDatabase.js
│   └── serviceRegistry.js
├── services/
│   ├── user-service/
│   ├── item-service/
│   └── list-service/
├── api-gateway/
└── client-demo.js
```

### _Funcionalidades Demonstradas:_

- - Registro e login de usuário\*
- - Criação de lista de compras\*
- - Adição de itens à lista\*
- - Busca de itens no catálogo\*
- - Dashboard agregado\*
- - Health checks funcionais\*

### _Cliente de Teste:_

_Criar `client-demo.js` que demonstre:_

1. _Registro de usuário_
2. _Login_
3. _Busca de itens_
4. _Criação de lista_
5. _Adição de itens à lista_
6. _Visualização do dashboard_

## _CRITÉRIOS DE AVALIAÇÃO_

### _Implementação Técnica (40%):_

- _Microsserviços funcionais independentes_
- _Service Discovery operacional_
- _API Gateway com roteamento correto_
- _Bancos NoSQL com schema adequado_

### _Integração (30%):_

- _Comunicação entre serviços_
- _Autenticação distribuída_
- _Circuit breaker funcionando_
- _Health checks automáticos_

### _Funcionalidades (30%):_

- _CRUD completo de listas_
- _Busca e filtros_
- _Dashboard agregado_
- _Cliente demonstrando fluxo completo_

## _INSTRUÇÕES DE EXECUÇÃO_

### _Setup:_

```bash
npm install
npm run install:all
```

### _Execução:_

```bash
# Terminal 1
cd services/user-service && npm start

# Terminal 2
cd services/item-service && npm start

# Terminal 3
cd services/list-service && npm start

# Terminal 4
cd api-gateway && npm start

# Terminal 5 - Teste
node client-demo.js
```

### _Verificação:_

```bash
curl http://localhost:3000/health
curl http://localhost:3000/registry
```

## _DICAS DE IMPLEMENTAÇÃO_

1. **\*Comece pelo User Service** - base para autenticação\*
2. **\*Use o exemplo do Roteiro 3** como referência para estrutura\*
3. **\*Implemente um serviço por vez** e teste isoladamente\*
4. **\*Service Registry é crítico** - teste bem a descoberta\*
5. **\*Logs são essenciais** para debug de comunicação entre serviços\*

### _Erros Comuns:_

- _Service Registry não compartilhado entre processos_
- _Problemas de timing na inicialização_
- _URLs hardcoded em vez de usar Service Discovery_
- _Falta de tratamento de erro na comunicação_

## _PRAZO DE ENTREGA_

**\*Data:** 29/09/2025
**Formato:** Código fonte + documentação em repositório Git
**Apresentação:** Demonstração ao vivo de 10 minutos\*
