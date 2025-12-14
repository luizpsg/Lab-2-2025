const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");

// AWS SDK imports
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
} = require("@aws-sdk/client-sqs");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração AWS
const awsConfig = {
  endpoint: process.env.AWS_ENDPOINT || "http://localhost:4566",
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  },
  forcePathStyle: true, // Necessário para LocalStack
};

// Clientes AWS
const s3Client = new S3Client(awsConfig);
const dynamoClient = new DynamoDBClient(awsConfig);
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sqsClient = new SQSClient(awsConfig);
const snsClient = new SNSClient(awsConfig);

// Configurações
const S3_BUCKET = process.env.S3_BUCKET || "task-images";
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || "tasks";
const SQS_QUEUE_URL =
  process.env.SQS_QUEUE_URL || "http://localhost:4566/000000000000/task-queue";
const SNS_TOPIC_ARN =
  process.env.SNS_TOPIC_ARN ||
  "arn:aws:sns:us-east-1:000000000000:task-notifications";

// URL pública do LocalStack (para acesso externo/navegador)
const PUBLIC_S3_URL = process.env.PUBLIC_S3_URL || "http://localhost:4566";

// Função para converter URLs internas para públicas
function toPublicUrl(url) {
  return url
    .replace("http://localstack:4566", PUBLIC_S3_URL)
    .replace("http://s3.localhost.localstack.cloud:4566", PUBLIC_S3_URL);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Configuração Multer para upload de arquivos
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Apenas imagens são permitidas"), false);
    }
  },
});

// ================== ROTAS S3 (Upload de Imagens) ==================

// Upload de imagem (multipart/form-data)
app.post("/api/images/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhuma imagem enviada" });
    }

    const fileExtension = req.file.originalname.split(".").pop() || "jpg";
    const fileName = `${uuidv4()}.${fileExtension}`;
    const key = `tasks/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    });

    await s3Client.send(command);

    // Gerar URL pré-assinada para acesso
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 3600 * 24 * 7,
    }); // 7 dias

    console.log(`✅ Imagem salva no S3: ${key}`);

    // Publicar evento no SNS
    await publishToSNS("IMAGE_UPLOADED", { key, bucket: S3_BUCKET });

    res.json({
      success: true,
      key,
      url: toPublicUrl(signedUrl),
      bucket: S3_BUCKET,
    });
  } catch (error) {
    console.error("❌ Erro ao fazer upload:", error);
    res.status(500).json({
      error: "Erro ao fazer upload da imagem",
      details: error.message,
    });
  }
});

// Upload de imagem em Base64
app.post("/api/images/upload-base64", async (req, res) => {
  try {
    const { image, filename } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Imagem Base64 não fornecida" });
    }

    // Remover prefixo data:image/...;base64, se existir
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    const fileExtension = filename?.split(".").pop() || "jpg";
    const fileName = `${uuidv4()}.${fileExtension}`;
    const key = `tasks/${fileName}`;

    // Detectar tipo MIME
    let contentType = "image/jpeg";
    if (image.startsWith("data:image/png")) contentType = "image/png";
    else if (image.startsWith("data:image/gif")) contentType = "image/gif";
    else if (image.startsWith("data:image/webp")) contentType = "image/webp";

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    // Gerar URL pré-assinada
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });
    const signedUrl = await getSignedUrl(s3Client, getCommand, {
      expiresIn: 3600 * 24 * 7,
    });

    console.log(`✅ Imagem Base64 salva no S3: ${key}`);

    // Publicar evento no SNS
    await publishToSNS("IMAGE_UPLOADED", { key, bucket: S3_BUCKET });

    res.json({
      success: true,
      key,
      url: toPublicUrl(signedUrl),
      bucket: S3_BUCKET,
    });
  } catch (error) {
    console.error("❌ Erro ao fazer upload Base64:", error);
    res.status(500).json({
      error: "Erro ao fazer upload da imagem",
      details: error.message,
    });
  }
});

// Listar imagens no bucket
app.get("/api/images", async (req, res) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: "tasks/",
    });

    const response = await s3Client.send(command);
    const images = response.Contents || [];

    // Gerar URLs pré-assinadas para cada imagem
    const imagesWithUrls = await Promise.all(
      images.map(async (img) => {
        const getCommand = new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: img.Key,
        });
        const url = await getSignedUrl(s3Client, getCommand, {
          expiresIn: 3600,
        });
        return {
          key: img.Key,
          size: img.Size,
          lastModified: img.LastModified,
          url: toPublicUrl(url),
        };
      })
    );

    res.json({ images: imagesWithUrls });
  } catch (error) {
    console.error("❌ Erro ao listar imagens:", error);
    res
      .status(500)
      .json({ error: "Erro ao listar imagens", details: error.message });
  }
});

// Deletar imagem
app.delete("/api/images/:key(*)", async (req, res) => {
  try {
    const { key } = req.params;

    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`🗑️ Imagem deletada do S3: ${key}`);

    res.json({ success: true, message: "Imagem deletada com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao deletar imagem:", error);
    res
      .status(500)
      .json({ error: "Erro ao deletar imagem", details: error.message });
  }
});

// ================== ROTAS DYNAMODB (CRUD de Tarefas) ==================

// Criar tarefa
app.post("/api/tasks", async (req, res) => {
  try {
    const task = {
      id: req.body.id || uuidv4(),
      ...req.body,
      createdAt: req.body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: DYNAMODB_TABLE,
      Item: task,
    });

    await docClient.send(command);
    console.log(`✅ Tarefa criada no DynamoDB: ${task.id}`);

    // Enviar mensagem para SQS
    await sendToSQS("TASK_CREATED", task);

    // Publicar no SNS
    await publishToSNS("TASK_CREATED", { taskId: task.id, title: task.title });

    res.status(201).json({ success: true, task });
  } catch (error) {
    console.error("❌ Erro ao criar tarefa:", error);
    res
      .status(500)
      .json({ error: "Erro ao criar tarefa", details: error.message });
  }
});

// Listar todas as tarefas
app.get("/api/tasks", async (req, res) => {
  try {
    const command = new ScanCommand({
      TableName: DYNAMODB_TABLE,
    });

    const response = await docClient.send(command);
    res.json({ tasks: response.Items || [] });
  } catch (error) {
    console.error("❌ Erro ao listar tarefas:", error);
    res
      .status(500)
      .json({ error: "Erro ao listar tarefas", details: error.message });
  }
});

// Buscar tarefa por ID
app.get("/api/tasks/:id", async (req, res) => {
  try {
    const command = new GetCommand({
      TableName: DYNAMODB_TABLE,
      Key: { id: req.params.id },
    });

    const response = await docClient.send(command);

    if (!response.Item) {
      return res.status(404).json({ error: "Tarefa não encontrada" });
    }

    res.json({ task: response.Item });
  } catch (error) {
    console.error("❌ Erro ao buscar tarefa:", error);
    res
      .status(500)
      .json({ error: "Erro ao buscar tarefa", details: error.message });
  }
});

// Atualizar tarefa
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Construir expressão de atualização dinamicamente
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach((key, index) => {
      if (key !== "id") {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = updates[key];
      }
    });

    // Adicionar updatedAt
    updateExpressions.push("#updatedAt = :updatedAt");
    expressionAttributeNames["#updatedAt"] = "updatedAt";
    expressionAttributeValues[":updatedAt"] = new Date().toISOString();

    const command = new UpdateCommand({
      TableName: DYNAMODB_TABLE,
      Key: { id },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    });

    const response = await docClient.send(command);
    console.log(`✅ Tarefa atualizada no DynamoDB: ${id}`);

    // Enviar mensagem para SQS
    await sendToSQS("TASK_UPDATED", response.Attributes);

    res.json({ success: true, task: response.Attributes });
  } catch (error) {
    console.error("❌ Erro ao atualizar tarefa:", error);
    res
      .status(500)
      .json({ error: "Erro ao atualizar tarefa", details: error.message });
  }
});

// Deletar tarefa
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const command = new DeleteCommand({
      TableName: DYNAMODB_TABLE,
      Key: { id: req.params.id },
    });

    await docClient.send(command);
    console.log(`🗑️ Tarefa deletada do DynamoDB: ${req.params.id}`);

    // Publicar no SNS
    await publishToSNS("TASK_DELETED", { taskId: req.params.id });

    res.json({ success: true, message: "Tarefa deletada com sucesso" });
  } catch (error) {
    console.error("❌ Erro ao deletar tarefa:", error);
    res
      .status(500)
      .json({ error: "Erro ao deletar tarefa", details: error.message });
  }
});

// ================== ROTAS SQS/SNS ==================

// Enviar mensagem para SQS
app.post("/api/queue/send", async (req, res) => {
  try {
    const { type, data } = req.body;
    const result = await sendToSQS(type, data);
    res.json({ success: true, messageId: result.MessageId });
  } catch (error) {
    console.error("❌ Erro ao enviar para SQS:", error);
    res
      .status(500)
      .json({ error: "Erro ao enviar mensagem", details: error.message });
  }
});

// Receber mensagens do SQS
app.get("/api/queue/messages", async (req, res) => {
  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: SQS_QUEUE_URL,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 5,
    });

    const response = await sqsClient.send(command);
    res.json({ messages: response.Messages || [] });
  } catch (error) {
    console.error("❌ Erro ao receber do SQS:", error);
    res
      .status(500)
      .json({ error: "Erro ao receber mensagens", details: error.message });
  }
});

// Publicar no SNS
app.post("/api/notifications/publish", async (req, res) => {
  try {
    const { type, data } = req.body;
    const result = await publishToSNS(type, data);
    res.json({ success: true, messageId: result.MessageId });
  } catch (error) {
    console.error("❌ Erro ao publicar no SNS:", error);
    res
      .status(500)
      .json({ error: "Erro ao publicar notificação", details: error.message });
  }
});

// ================== FUNÇÕES AUXILIARES ==================

async function sendToSQS(type, data) {
  const command = new SendMessageCommand({
    QueueUrl: SQS_QUEUE_URL,
    MessageBody: JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString(),
    }),
  });

  return sqsClient.send(command);
}

async function publishToSNS(type, data) {
  const command = new PublishCommand({
    TopicArn: SNS_TOPIC_ARN,
    Message: JSON.stringify({
      type,
      data,
      timestamp: new Date().toISOString(),
    }),
    Subject: `Task Manager: ${type}`,
  });

  return snsClient.send(command);
}

// ================== ROTAS DE SAÚDE ==================

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/api/status", async (req, res) => {
  const status = {
    server: "OK",
    s3: "CHECKING",
    dynamodb: "CHECKING",
    sqs: "CHECKING",
    sns: "CHECKING",
  };

  try {
    // Verificar S3
    await s3Client.send(
      new ListObjectsV2Command({ Bucket: S3_BUCKET, MaxKeys: 1 })
    );
    status.s3 = "OK";
  } catch (e) {
    status.s3 = "ERROR: " + e.message;
  }

  try {
    // Verificar DynamoDB
    await docClient.send(
      new ScanCommand({ TableName: DYNAMODB_TABLE, Limit: 1 })
    );
    status.dynamodb = "OK";
  } catch (e) {
    status.dynamodb = "ERROR: " + e.message;
  }

  try {
    // Verificar SQS
    await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: SQS_QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 1,
      })
    );
    status.sqs = "OK";
  } catch (e) {
    status.sqs = "ERROR: " + e.message;
  }

  res.json(status);
});

// ================== INICIAR SERVIDOR ==================

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════════════════╗
  ║     🚀 Task Manager Backend - LocalStack Integration     ║
  ╠══════════════════════════════════════════════════════════╣
  ║  Server:    http://localhost:${PORT}                        ║
  ║  S3 Bucket: ${S3_BUCKET.padEnd(40)}║
  ║  DynamoDB:  ${DYNAMODB_TABLE.padEnd(40)}║
  ╚══════════════════════════════════════════════════════════╝
  `);
});
