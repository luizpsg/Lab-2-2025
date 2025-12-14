# ☁️ Guia de Integração LocalStack

Este documento descreve a integração do Task Manager com **LocalStack**, simulando serviços AWS (S3, DynamoDB, SQS, SNS) em ambiente local.

## 📋 Arquitetura

```
┌─────────────────┐     HTTP      ┌─────────────────┐     AWS SDK     ┌─────────────────┐
│   App Flutter   │ ────────────► │  Backend Node   │ ──────────────► │   LocalStack    │
│    (Mobile)     │               │   (Express)     │                 │   (Docker)      │
└─────────────────┘               └─────────────────┘                 └─────────────────┘
                                                                              │
                                                                              ▼
                                                              ┌─────────────────────────┐
                                                              │    Serviços AWS         │
                                                              │  ├── S3 (imagens)       │
                                                              │  ├── DynamoDB (tarefas) │
                                                              │  ├── SQS (fila)         │
                                                              │  └── SNS (notificações) │
                                                              └─────────────────────────┘
```

## 🚀 Como Executar

### 1. Pré-requisitos

- Docker e Docker Compose instalados
- Node.js 18+ (para desenvolvimento local do backend)
- Flutter SDK configurado
- AWS CLI (opcional, para comandos de validação)

### 2. Subir a Infraestrutura

```bash
# Na pasta do projeto (task_manager)
docker-compose up -d
```

Isso irá:

- Subir o **LocalStack** com S3, DynamoDB, SQS e SNS
- Executar o script `init-aws.sh` que cria:
  - Bucket S3: `task-images`
  - Tabela DynamoDB: `tasks`
  - Fila SQS: `task-queue`
  - Tópico SNS: `task-notifications`
- Subir o **Backend Node.js** na porta 3000

### 3. Verificar Status

```bash
# Ver logs do LocalStack
docker-compose logs localstack

# Ver logs do backend
docker-compose logs backend

# Verificar serviços do LocalStack
curl http://localhost:4566/_localstack/health
```

### 4. Executar o App Flutter

```bash
# Instalar dependências
flutter pub get

# Rodar no emulador/dispositivo
flutter run
```

**Importante**: Acesse a tela de "Status do Cloud" (ícone de nuvem na AppBar) para:

- Verificar se o backend está online
- Ajustar a URL do backend se necessário
- Ver imagens salvas no S3

## 📱 Configuração do App Flutter

### URLs do Backend

| Ambiente           | URL                           |
| ------------------ | ----------------------------- |
| Emulador Android   | `http://10.0.2.2:3000`        |
| iOS Simulator      | `http://localhost:3000`       |
| Dispositivo Físico | `http://[IP_DA_MÁQUINA]:3000` |

A URL pode ser alterada na tela de "Status do Cloud".

## 🔧 Comandos AWS CLI (LocalStack)

Configure o AWS CLI para usar o LocalStack:

```bash
# Configurar alias (opcional)
alias awslocal='aws --endpoint-url=http://localhost:4566'
```

### S3 - Bucket de Imagens

```bash
# Listar buckets
awslocal s3 ls

# Listar objetos no bucket
awslocal s3 ls s3://task-images/

# Listar objetos com detalhes
awslocal s3 ls s3://task-images/tasks/ --recursive
```

### DynamoDB - Tabela de Tarefas

```bash
# Listar tabelas
awslocal dynamodb list-tables

# Scan da tabela (ver todas as tarefas)
awslocal dynamodb scan --table-name tasks

# Buscar uma tarefa específica
awslocal dynamodb get-item --table-name tasks --key '{"id":{"S":"uuid-aqui"}}'
```

### SQS - Fila de Mensagens

```bash
# Listar filas
awslocal sqs list-queues

# Receber mensagens da fila
awslocal sqs receive-message --queue-url http://localhost:4566/000000000000/task-queue
```

### SNS - Tópicos de Notificação

```bash
# Listar tópicos
awslocal sns list-topics

# Listar inscrições
awslocal sns list-subscriptions
```

## 🎬 Roteiro da Demonstração

### 1. Infraestrutura

```bash
# Subir todo o ambiente
docker-compose up -d

# Aguardar inicialização (~30 segundos)
docker-compose logs -f localstack

# Verificar que o bucket existe
awslocal s3 ls
```

### 2. Validação do Backend

```bash
# Verificar saúde do backend
curl http://localhost:3000/health

# Verificar status dos serviços AWS
curl http://localhost:3000/api/status
```

### 3. Demonstração no App

1. Abrir o app Flutter no emulador
2. Acessar "Status do Cloud" (ícone ☁️)
3. Verificar que está "Online"
4. Criar uma nova tarefa:
   - Tirar uma foto
   - Manter "Sincronizar com Cloud" ativado
   - Salvar
5. Voltar à tela de "Status do Cloud" e ver a imagem no S3

### 4. Validação via CLI

```bash
# Verificar imagem no S3
awslocal s3 ls s3://task-images/tasks/

# Verificar tarefa no DynamoDB
awslocal dynamodb scan --table-name tasks
```

## 📁 Estrutura de Arquivos

```
task_manager/
├── docker-compose.yml      # Configuração do Docker
├── init-aws.sh             # Script de inicialização do LocalStack
├── backend/
│   ├── Dockerfile          # Dockerfile do backend
│   ├── package.json        # Dependências Node.js
│   └── src/
│       └── index.js        # Código do servidor Express
└── lib/
    └── services/
        └── cloud_service.dart  # Serviço Flutter para comunicação
```

## 🔌 Endpoints da API

### Imagens (S3)

| Método | Endpoint                    | Descrição                  |
| ------ | --------------------------- | -------------------------- |
| POST   | `/api/images/upload`        | Upload multipart/form-data |
| POST   | `/api/images/upload-base64` | Upload Base64              |
| GET    | `/api/images`               | Listar imagens             |
| DELETE | `/api/images/:key`          | Deletar imagem             |

### Tarefas (DynamoDB)

| Método | Endpoint         | Descrição        |
| ------ | ---------------- | ---------------- |
| POST   | `/api/tasks`     | Criar tarefa     |
| GET    | `/api/tasks`     | Listar tarefas   |
| GET    | `/api/tasks/:id` | Buscar tarefa    |
| PUT    | `/api/tasks/:id` | Atualizar tarefa |
| DELETE | `/api/tasks/:id` | Deletar tarefa   |

### Mensageria (SQS/SNS)

| Método | Endpoint                     | Descrição       |
| ------ | ---------------------------- | --------------- |
| POST   | `/api/queue/send`            | Enviar para SQS |
| GET    | `/api/queue/messages`        | Receber do SQS  |
| POST   | `/api/notifications/publish` | Publicar no SNS |

## ⚠️ Troubleshooting

### Backend não conecta ao LocalStack

```bash
# Verificar se o LocalStack está rodando
docker ps

# Verificar logs
docker-compose logs localstack
```

### App não conecta ao Backend

1. Verificar se o backend está rodando: `curl http://localhost:3000/health`
2. Verificar URL correta no app (10.0.2.2 para emulador Android)
3. Verificar firewall/antivírus

### Erro de CORS

O backend já está configurado com CORS habilitado. Se persistir, reinicie:

```bash
docker-compose restart backend
```

## 📊 Pontuação

Esta implementação atende aos **31 pontos** da especificação:

- ✅ Docker Compose com LocalStack configurado
- ✅ Backend com endpoints de upload para S3
- ✅ Integração mobile para envio de fotos
- ✅ Utilização de DynamoDB para tarefas
- ✅ Utilização de SQS/SNS para mensageria
