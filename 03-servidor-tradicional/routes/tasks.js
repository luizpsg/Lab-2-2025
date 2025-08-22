const express = require("express");
const { v4: uuidv4 } = require("uuid");
const Task = require("../models/Task");
const database = require("../database/database");
const { authMiddleware } = require("../middleware/auth");
const { validate } = require("../middleware/validation");
const { cacheMiddleware, invalidateCache } = require("../middleware/cache");
const {
  userRateLimit,
  taskCreationRateLimit,
  readRateLimit
} = require("../middleware/rateLimit");
const { logger } = require("../config/logger");

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Listar tarefas com paginação e filtros avançados
router.get("/", readRateLimit, cacheMiddleware(180), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      completed,
      priority,
      category,
      tags,
      dueDateFrom,
      dueDateTo,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC"
    } = req.query;

    // Validação dos parâmetros
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // Construir query base
    let sql = "SELECT * FROM tasks WHERE userId = ?";
    const params = [req.user.id];
    const conditions = [];

    // Filtros
    if (completed !== undefined) {
      conditions.push("completed = ?");
      params.push(completed === "true" ? 1 : 0);
    }

    if (priority) {
      conditions.push("priority = ?");
      params.push(priority);
    }

    if (category) {
      conditions.push("category = ?");
      params.push(category);
    }

    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      const tagConditions = tagArray.map(() => "tags LIKE ?");
      conditions.push(`(${tagConditions.join(" OR ")})`);
      tagArray.forEach(tag => params.push(`%${tag}%`));
    }

    if (dueDateFrom) {
      conditions.push("dueDate >= ?");
      params.push(dueDateFrom);
    }

    if (dueDateTo) {
      conditions.push("dueDate <= ?");
      params.push(dueDateTo);
    }

    if (search) {
      conditions.push("(title LIKE ? OR description LIKE ? OR notes LIKE ?)");
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Adicionar condições à query
    if (conditions.length > 0) {
      sql += " AND " + conditions.join(" AND ");
    }

    // Ordenação
    const allowedSortFields = ["createdAt", "updatedAt", "dueDate", "priority", "title"];
    const allowedSortOrders = ["ASC", "DESC"];

    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const sortDirection = allowedSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : "DESC";

    sql += ` ORDER BY ${sortField} ${sortDirection}`;

    // Query para contar total de registros
    const countSql = sql.replace("SELECT *", "SELECT COUNT(*) as total");
    const countResult = await database.get(countSql, params);
    const total = countResult.total;

    // Query para dados com paginação
    sql += " LIMIT ? OFFSET ?";
    params.push(limitNum, offset);

    const rows = await database.all(sql, params);

    // Processar tags (converter de string JSON para array)
    const tasks = rows.map(row => {
      const taskData = { ...row, completed: row.completed === 1 };
      if (row.tags) {
        try {
          taskData.tags = JSON.parse(row.tags);
        } catch (e) {
          taskData.tags = [];
        }
      }
      return new Task(taskData);
    });

    // Calcular metadados de paginação
    const totalPages = Math.ceil(total / limitNum);
    const hasNext = pageNum < totalPages;
    const hasPrev = pageNum > 1;

    logger.info('Tasks retrieved', {
      userId: req.user.id,
      page: pageNum,
      limit: limitNum,
      total,
      filters: { completed, priority, category, tags, dueDateFrom, dueDateTo, search }
    });

    res.json({
      success: true,
      data: tasks.map((task) => task.toJSON()),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext,
        hasPrev,
        nextPage: hasNext ? pageNum + 1 : null,
        prevPage: hasPrev ? pageNum - 1 : null
      }
    });
  } catch (error) {
    logger.error('Error retrieving tasks', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Criar tarefa
router.post("/", taskCreationRateLimit, validate("task"), async (req, res) => {
  try {
    const taskData = {
      id: uuidv4(),
      ...req.body,
      userId: req.user.id,
      tags: Array.isArray(req.body.tags) ? req.body.tags : []
    };

    const task = new Task(taskData);
    const validation = task.validate();

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: validation.errors,
      });
    }

    // Converter tags para JSON string para armazenamento
    const tagsJson = JSON.stringify(task.tags);

    await database.run(
      `INSERT INTO tasks (
        id, title, description, priority, userId, category, tags, 
        dueDate, estimatedTime, actualTime, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        task.id, task.title, task.description, task.priority, task.userId,
        task.category, tagsJson, task.dueDate, task.estimatedTime,
        task.actualTime, task.notes
      ]
    );

    // Invalidar cache relacionado
    invalidateCache(`cache:/api/tasks:${req.user.id}`);

    logger.info('Task created', {
      taskId: task.id,
      userId: req.user.id,
      title: task.title
    });

    res.status(201).json({
      success: true,
      message: "Tarefa criada com sucesso",
      data: task.toJSON(),
    });
  } catch (error) {
    logger.error('Error creating task', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Buscar tarefa por ID
router.get("/:id", readRateLimit, cacheMiddleware(300), async (req, res) => {
  try {
    const row = await database.get(
      "SELECT * FROM tasks WHERE id = ? AND userId = ?",
      [req.params.id, req.user.id]
    );

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "Tarefa não encontrada",
      });
    }

    // Processar tags
    const taskData = { ...row, completed: row.completed === 1 };
    if (row.tags) {
      try {
        taskData.tags = JSON.parse(row.tags);
      } catch (e) {
        taskData.tags = [];
      }
    }

    const task = new Task(taskData);
    res.json({
      success: true,
      data: task.toJSON(),
    });
  } catch (error) {
    logger.error('Error retrieving task', { error: error.message, taskId: req.params.id, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Atualizar tarefa
router.put("/:id", userRateLimit, async (req, res) => {
  try {
    const {
      title, description, completed, priority, category,
      tags, dueDate, estimatedTime, actualTime, notes
    } = req.body;

    // Converter tags para JSON string
    const tagsJson = tags ? JSON.stringify(tags) : null;

    const result = await database.run(
      `UPDATE tasks SET 
        title = ?, description = ?, completed = ?, priority = ?, 
        category = ?, tags = ?, dueDate = ?, estimatedTime = ?, 
        actualTime = ?, notes = ?, updatedAt = datetime('now') 
       WHERE id = ? AND userId = ?`,
      [
        title, description, completed ? 1 : 0, priority,
        category, tagsJson, dueDate, estimatedTime,
        actualTime, notes, req.params.id, req.user.id
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Tarefa não encontrada",
      });
    }

    // Invalidar cache relacionado
    invalidateCache(`cache:/api/tasks:${req.user.id}`);

    const updatedRow = await database.get(
      "SELECT * FROM tasks WHERE id = ? AND userId = ?",
      [req.params.id, req.user.id]
    );

    // Processar tags
    const taskData = { ...updatedRow, completed: updatedRow.completed === 1 };
    if (updatedRow.tags) {
      try {
        taskData.tags = JSON.parse(updatedRow.tags);
      } catch (e) {
        taskData.tags = [];
      }
    }

    const task = new Task(taskData);

    logger.info('Task updated', {
      taskId: req.params.id,
      userId: req.user.id,
      fields: Object.keys(req.body)
    });

    res.json({
      success: true,
      message: "Tarefa atualizada com sucesso",
      data: task.toJSON(),
    });
  } catch (error) {
    logger.error('Error updating task', { error: error.message, taskId: req.params.id, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Deletar tarefa
router.delete("/:id", userRateLimit, async (req, res) => {
  try {
    const result = await database.run(
      "DELETE FROM tasks WHERE id = ? AND userId = ?",
      [req.params.id, req.user.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Tarefa não encontrada",
      });
    }

    // Invalidar cache relacionado
    invalidateCache(`cache:/api/tasks:${req.user.id}`);

    logger.info('Task deleted', {
      taskId: req.params.id,
      userId: req.user.id
    });

    res.json({
      success: true,
      message: "Tarefa deletada com sucesso",
    });
  } catch (error) {
    logger.error('Error deleting task', { error: error.message, taskId: req.params.id, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Estatísticas
router.get("/stats/summary", readRateLimit, cacheMiddleware(300), async (req, res) => {
  try {
    const stats = await database.get(
      `SELECT 
        COUNT(*) as total, 
        SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed, 
        SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN dueDate < datetime('now') AND completed = 0 THEN 1 ELSE 0 END) as overdue
       FROM tasks WHERE userId = ?`,
      [req.user.id]
    );

    // Estatísticas por categoria
    const categoryStats = await database.all(
      `SELECT category, COUNT(*) as count 
       FROM tasks WHERE userId = ? 
       GROUP BY category 
       ORDER BY count DESC`,
      [req.user.id]
    );

    // Estatísticas por prioridade
    const priorityStats = await database.all(
      `SELECT priority, COUNT(*) as count 
       FROM tasks WHERE userId = ? 
       GROUP BY priority 
       ORDER BY count DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        ...stats,
        completionRate: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(2) : 0,
        overdueRate: stats.total > 0 ? ((stats.overdue / stats.total) * 100).toFixed(2) : 0,
        categories: categoryStats,
        priorities: priorityStats
      },
    });
  } catch (error) {
    logger.error('Error retrieving task stats', { error: error.message, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Buscar tarefas por categoria
router.get("/category/:category", readRateLimit, cacheMiddleware(180), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const countSql = "SELECT COUNT(*) as total FROM tasks WHERE userId = ? AND category = ?";
    const countResult = await database.get(countSql, [req.user.id, req.params.category]);
    const total = countResult.total;

    const sql = `SELECT * FROM tasks 
                 WHERE userId = ? AND category = ? 
                 ORDER BY createdAt DESC 
                 LIMIT ? OFFSET ?`;

    const rows = await database.all(sql, [req.user.id, req.params.category, limitNum, offset]);

    const tasks = rows.map(row => {
      const taskData = { ...row, completed: row.completed === 1 };
      if (row.tags) {
        try {
          taskData.tags = JSON.parse(row.tags);
        } catch (e) {
          taskData.tags = [];
        }
      }
      return new Task(taskData);
    });

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: tasks.map((task) => task.toJSON()),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    logger.error('Error retrieving tasks by category', { error: error.message, category: req.params.category, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

// Buscar tarefas por tags
router.get("/tags/:tags", readRateLimit, cacheMiddleware(180), async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    const tagArray = req.params.tags.split(',').map(tag => tag.trim());
    const tagConditions = tagArray.map(() => "tags LIKE ?");
    const tagParams = tagArray.map(tag => `%${tag}%`);

    const countSql = `SELECT COUNT(*) as total FROM tasks WHERE userId = ? AND (${tagConditions.join(" OR ")})`;
    const countResult = await database.get(countSql, [req.user.id, ...tagParams]);
    const total = countResult.total;

    const sql = `SELECT * FROM tasks 
                 WHERE userId = ? AND (${tagConditions.join(" OR ")}) 
                 ORDER BY createdAt DESC 
                 LIMIT ? OFFSET ?`;

    const rows = await database.all(sql, [req.user.id, ...tagParams, limitNum, offset]);

    const tasks = rows.map(row => {
      const taskData = { ...row, completed: row.completed === 1 };
      if (row.tags) {
        try {
          taskData.tags = JSON.parse(row.tags);
        } catch (e) {
          taskData.tags = [];
        }
      }
      return new Task(taskData);
    });

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: tasks.map((task) => task.toJSON()),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    logger.error('Error retrieving tasks by tags', { error: error.message, tags: req.params.tags, userId: req.user.id });
    res.status(500).json({
      success: false,
      message: "Erro interno do servidor"
    });
  }
});

module.exports = router;
