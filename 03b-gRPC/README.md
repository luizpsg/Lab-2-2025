# Sistema gRPC Avançado com Autenticação, Load Balancing e Chat em Tempo Real

Este projeto implementa um sistema gRPC completo com funcionalidades avançadas incluindo autenticação JWT, tratamento robusto de erros, load balancing e chat em tempo real usando streaming bidirecional.

## 🚀 Funcionalidades Implementadas

### 1. ✅ Autenticação JWT com Interceptadores

- **Interceptadores automáticos** para validação de tokens JWT
- **Middleware de autenticação** que valida tokens em todas as chamadas protegidas
- **Exclusão automática** de métodos públicos (Register, Login, ValidateToken)
- **Metadata gRPC** com informações do usuário autenticado

### 2. ✅ Tratamento Robusto de Erros gRPC

- **Sistema de classificação de erros** com tipos específicos
- **Códigos de status gRPC** apropriados para cada tipo de erro
- **Logging estruturado** de erros com contexto
- **Metadata de erro** com informações detalhadas
- **Wrapper para métodos** com tratamento automático de exceções

### 3. ✅ Load Balancing Entre Múltiplos Servidores

- **Múltiplas estratégias** de balanceamento:
  - Round Robin
  - Least Connections
  - Random
  - Weighted Round Robin
- **Health checks** automáticos para monitoramento de servidores
- **Controle de conexões** por servidor
- **Configuração dinâmica** de pesos e limites

### 4. ✅ Chat em Tempo Real com Streaming Bidirecional

- **Streaming bidirecional** para comunicação em tempo real
- **Múltiplas salas** de chat com suporte a histórico
- **Tipos de mensagem** variados (texto, sistema, notificações)
- **Gerenciamento de conexões** ativas por sala
- **Histórico persistente** com paginação

## 📁 Estrutura do Projeto

```
├── middleware/
│   ├── authInterceptor.js      # Interceptador de autenticação JWT
│   ├── errorHandler.js         # Sistema de tratamento de erros
│   └── loadBalancer.js         # Sistema de load balancing
├── services/
│   ├── AuthService.js          # Serviço de autenticação
│   ├── TaskService.js          # Serviço de tarefas
│   └── ChatService.js          # Serviço de chat em tempo real
├── protos/
│   ├── auth_service.proto      # Definições de autenticação
│   ├── task_service.proto      # Definições de tarefas
│   └── chat_service.proto      # Definições de chat
├── client.js                   # Cliente de exemplo
├── chat_client.js              # Cliente de chat interativo
├── load_balancer_test.js       # Testes do load balancer
└── server.js                   # Servidor principal
```

## 🛠️ Instalação e Execução

### Pré-requisitos

- Node.js 16+
- npm ou yarn

### Instalação

```bash
npm install
```

### Execução

#### 1. Iniciar o Servidor

```bash
npm start
```

#### 2. Testar Funcionalidades Básicas

```bash
npm run client
```

#### 3. Testar Chat em Tempo Real

```bash
npm run chat
```

#### 4. Testar Load Balancing

```bash
npm run test:loadbalancer
```

## 🔧 Configuração

### Variáveis de Ambiente

```bash
# JWT Secret (obrigatório para produção)
JWT_SECRET=seu-secret-super-seguro

# Porta do servidor gRPC
GRPC_PORT=50051
```

### Configuração do Load Balancer

```javascript
// Adicionar servidores
loadBalancer.addServer("localhost:50051", {
  weight: 1,
  maxConnections: 10,
});

// Configurar estratégia
loadBalancer.setStrategy("round_robin");
```

## 📊 Estratégias de Load Balancing

### 1. Round Robin

Distribui requisições sequencialmente entre servidores disponíveis.

### 2. Least Connections

Seleciona o servidor com menor número de conexões ativas.

### 3. Random

Seleciona um servidor aleatoriamente.

### 4. Weighted Round Robin

Distribui requisições baseado em pesos configurados.

## 💬 Sistema de Chat

### Funcionalidades

- **Salas múltiplas** com nomes e descrições
- **Histórico persistente** com paginação
- **Tipos de mensagem** (texto, sistema, notificações)
- **Gerenciamento de usuários** por sala
- **Streaming bidirecional** para tempo real

### Uso do Cliente de Chat

```bash
npm run chat
```

O cliente irá:

1. Fazer login ou registrar usuário
2. Listar salas disponíveis
3. Entrar na sala "general"
4. Mostrar histórico recente
5. Permitir envio de mensagens em tempo real

## 🔐 Sistema de Autenticação

### Interceptadores Automáticos

- Validação automática de tokens JWT
- Exclusão de métodos públicos
- Adição de metadata com informações do usuário

### Métodos Protegidos

Todos os métodos do TaskService e ChatService requerem autenticação, exceto:

- `Register`
- `Login`
- `ValidateToken`

## 🚨 Tratamento de Erros

### Tipos de Erro Suportados

- **VALIDATION_ERROR**: Dados inválidos
- **AUTHENTICATION_ERROR**: Falha na autenticação
- **AUTHORIZATION_ERROR**: Acesso negado
- **NOT_FOUND_ERROR**: Recurso não encontrado
- **CONFLICT_ERROR**: Conflito de dados
- **RATE_LIMIT_ERROR**: Limite de requisições
- **TIMEOUT_ERROR**: Tempo limite excedido
- **INTERNAL_ERROR**: Erro interno

### Códigos gRPC

Cada tipo de erro mapeia para códigos de status gRPC apropriados:

- `INVALID_ARGUMENT` para erros de validação
- `UNAUTHENTICATED` para erros de autenticação
- `PERMISSION_DENIED` para erros de autorização
- `NOT_FOUND` para recursos não encontrados
- `ALREADY_EXISTS` para conflitos
- `RESOURCE_EXHAUSTED` para limites
- `DEADLINE_EXCEEDED` para timeouts
- `INTERNAL` para erros internos

## 📈 Monitoramento e Logs

### Logs Estruturados

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "ERROR",
  "message": "Token inválido",
  "type": "AUTHENTICATION_ERROR",
  "context": {
    "userId": "user123",
    "method": "CreateTask",
    "requestId": "req456"
  }
}
```

### Estatísticas do Load Balancer

```javascript
{
  "totalServers": 3,
  "healthyServers": 2,
  "strategy": "round_robin",
  "servers": [
    {
      "id": "server_1",
      "address": "localhost:50051",
      "isHealthy": true,
      "connections": 5,
      "weight": 1
    }
  ]
}
```

## 🧪 Testes

### Teste do Load Balancer

```bash
npm run test:loadbalancer
```

Testa todas as estratégias de load balancing e health checks.

### Teste do Cliente

```bash
npm run client
```

Demonstra funcionalidades básicas do sistema.

### Teste do Chat

```bash
npm run chat
```

Interface interativa para testar o chat em tempo real.

## 🔧 Desenvolvimento

### Adicionando Novos Serviços

1. Criar arquivo `.proto` em `protos/`
2. Implementar serviço em `services/`
3. Registrar no `server.js`
4. Adicionar tratamento de erro com `errorHandler.wrapServiceMethod()`

### Adicionando Novos Interceptadores

1. Criar classe de interceptador em `middleware/`
2. Implementar método `createInterceptor()`
3. Aplicar no servidor gRPC

## 📚 Referências

- [gRPC Documentation](https://grpc.io/docs/)
- [Protocol Buffers](https://developers.google.com/protocol-buffers)
- [JWT.io](https://jwt.io/)
- [Node.js gRPC](https://grpc.io/docs/languages/node/)

---

**Desenvolvido por:** Luiz Paulo Saud
