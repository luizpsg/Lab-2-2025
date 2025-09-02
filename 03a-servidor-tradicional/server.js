const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");

const config = require("./config/database");
const database = require("./database/database");
const authRoutes = require("./routes/auth");
const taskRoutes = require("./routes/tasks");
const userRoutes = require("./routes/users");
const { logRequest, logError, logger } = require("./config/logger");
const { getCacheStats, clearCache } = require("./middleware/cache");

/**
 * Servidor de Aplicação Tradicional
 *
 * Implementa arquitetura cliente-servidor conforme Coulouris et al. (2012):
 * - Centralização do estado da aplicação
 * - Comunicação Request-Reply via HTTP
 * - Processamento síncrono das requisições
 * 
 * Funcionalidades implementadas:
 * - Paginação avançada
 * - Cache em memória
 * - Logs estruturados
 * - Rate limiting por usuário
 * - Filtros avançados por data, categoria, tags
 */

const app = express();

// Middleware de segurança
app.use(helmet());
app.use(cors());

// Parsing de dados
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// Logging estruturado de requisições
app.use(logRequest);

// Rotas principais
app.get("/", (req, res) => {
  res.json({
    service: "Task Management API",
    version: "2.0.0",
    architecture: "Traditional Client-Server",
    features: [
      "Paginação avançada",
      "Cache em memória",
      "Logs estruturados",
      "Rate limiting por usuário",
      "Filtros avançados"
    ],
    endpoints: {
      auth: ["POST /api/auth/register", "POST /api/auth/login", "GET /api/auth/verify"],
      tasks: [
        "GET /api/tasks (com paginação e filtros)",
        "POST /api/tasks",
        "PUT /api/tasks/:id",
        "DELETE /api/tasks/:id",
        "GET /api/tasks/stats/summary",
        "GET /api/tasks/category/:category",
        "GET /api/tasks/tags/:tags"
      ],
      users: [
        "GET /api/users",
        "GET /api/users/:id",
        "PUT /api/users/change-password",
        "DELETE /api/users/:id",
      ],
      admin: [
        "GET /api/admin/cache/stats",
        "POST /api/admin/cache/clear",
        "GET /api/admin/logs"
      ]
    },
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "2.0.0",
    features: {
      pagination: true,
      cache: true,
      logging: true,
      rateLimiting: true,
      advancedFilters: true
    }
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/users", userRoutes);

// Rotas administrativas
app.get("/api/admin/cache/stats", (req, res) => {
  try {
    const stats = getCacheStats();
    res.json({
      success: true,
      data: stats,
      message: "Estatísticas do cache obtidas com sucesso"
    });
  } catch (error) {
    logger.error('Error getting cache stats', { error: error.message });
    res.status(500).json({
      success: false,
      message: "Erro ao obter estatísticas do cache"
    });
  }
});

app.post("/api/admin/cache/clear", (req, res) => {
  try {
    clearCache();
    res.json({
      success: true,
      message: "Cache limpo com sucesso"
    });
  } catch (error) {
    logger.error('Error clearing cache', { error: error.message });
    res.status(500).json({
      success: false,
      message: "Erro ao limpar cache"
    });
  }
});

// 404 handler
app.use("*", (req, res) => {
  logger.warn('Endpoint not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    message: "Endpoint não encontrado",
  });
});

// Error handler global com logging estruturado
app.use(logError);
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    userId: req.user?.id || 'anonymous'
  });

  res.status(500).json({
    success: false,
    message: "Erro interno do servidor",
  });
});

// Inicialização
async function startServer() {
  try {
    await database.init();

    app.listen(config.port, () => {
      logger.info('Server started successfully', {
        port: config.port,
        environment: process.env.NODE_ENV || 'development',
        version: '2.0.0'
      });

      console.log("🚀 =================================");
      console.log(`🚀 Servidor iniciado na porta ${config.port}`);
      console.log(`🚀 URL: http://localhost:${config.port}`);
      console.log(`🚀 Health: http://localhost:${config.port}/health`);
      console.log(`🚀 Versão: 2.0.0`);
      console.log("🚀 =================================");
      console.log("✨ Funcionalidades implementadas:");
      console.log("   • Paginação avançada");
      console.log("   • Cache em memória");
      console.log("   • Logs estruturados");
      console.log("   • Rate limiting por usuário");
      console.log("   • Filtros avançados");
      console.log("🚀 =================================");
    });
  } catch (error) {
    logger.error('Server startup failed', { error: error.message, stack: error.stack });
    console.error("❌ Falha na inicialização:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  try {
    database.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  try {
    database.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message });
    process.exit(1);
  }
});

if (require.main === module) {
  startServer();
}

module.exports = app;
