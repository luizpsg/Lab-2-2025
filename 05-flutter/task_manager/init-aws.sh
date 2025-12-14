#!/bin/bash

echo "🚀 Inicializando recursos AWS no LocalStack..."

# Configurar AWS CLI para usar LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1

# Criar bucket S3 para imagens
echo "📦 Criando bucket S3: task-images"
awslocal s3 mb s3://task-images
awslocal s3api put-bucket-cors --bucket task-images --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}'

# Criar tabela DynamoDB para tarefas
echo "🗄️ Criando tabela DynamoDB: tasks"
awslocal dynamodb create-table \
    --table-name tasks \
    --attribute-definitions \
        AttributeName=id,AttributeType=S \
    --key-schema \
        AttributeName=id,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5

# Criar fila SQS para processamento de tarefas
echo "📨 Criando fila SQS: task-queue"
awslocal sqs create-queue --queue-name task-queue

# Criar tópico SNS para notificações
echo "🔔 Criando tópico SNS: task-notifications"
awslocal sns create-topic --name task-notifications

# Inscrever a fila SQS no tópico SNS
echo "🔗 Inscrevendo SQS no SNS..."
awslocal sns subscribe \
    --topic-arn arn:aws:sns:us-east-1:000000000000:task-notifications \
    --protocol sqs \
    --notification-endpoint arn:aws:sqs:us-east-1:000000000000:task-queue

echo "✅ Todos os recursos AWS foram criados com sucesso!"

# Listar recursos criados
echo ""
echo "📋 Recursos criados:"
echo "-------------------"
echo "Buckets S3:"
awslocal s3 ls
echo ""
echo "Tabelas DynamoDB:"
awslocal dynamodb list-tables
echo ""
echo "Filas SQS:"
awslocal sqs list-queues
echo ""
echo "Tópicos SNS:"
awslocal sns list-topics

