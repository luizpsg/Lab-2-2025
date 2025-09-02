const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { logger } = require("../config/logger");

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, "tasks.db");
    this.db = null;
  }

  async init() {
    this.db = new sqlite3.Database(this.dbPath);
    await this.createTables();
    await this.migrateDatabase();
    console.log("✅ Database inicializado");
  }

  async createTables() {
    const userTable = `
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                firstName TEXT NOT NULL,
                lastName TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
            )`;

    const taskTable = `
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT,
                completed INTEGER DEFAULT 0,
                priority TEXT DEFAULT 'medium',
                userId TEXT NOT NULL,
                category TEXT DEFAULT 'geral',
                tags TEXT DEFAULT '[]',
                dueDate DATETIME,
                estimatedTime INTEGER,
                actualTime INTEGER,
                notes TEXT,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES users (id)
            )`;

    return Promise.all([this.run(userTable), this.run(taskTable)]);
  }

  async migrateDatabase() {
    try {
      // Verificar se a coluna 'role' existe na tabela users
      const userColumns = await this.all("PRAGMA table_info(users)");
      const hasRole = userColumns.some(col => col.name === 'role');

      if (!hasRole) {
        await this.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'");
        logger.info('Database migration: added role column to users table');
      }

      // Verificar se as novas colunas existem na tabela tasks
      const taskColumns = await this.all("PRAGMA table_info(tasks)");
      const newColumns = [
        { name: 'category', sql: 'ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT "geral"' },
        { name: 'tags', sql: 'ALTER TABLE tasks ADD COLUMN tags TEXT DEFAULT "[]"' },
        { name: 'dueDate', sql: 'ALTER TABLE tasks ADD COLUMN dueDate DATETIME' },
        { name: 'estimatedTime', sql: 'ALTER TABLE tasks ADD COLUMN estimatedTime INTEGER' },
        { name: 'actualTime', sql: 'ALTER TABLE tasks ADD COLUMN actualTime INTEGER' },
        { name: 'notes', sql: 'ALTER TABLE tasks ADD COLUMN notes TEXT' }
      ];

      for (const column of newColumns) {
        const exists = taskColumns.some(col => col.name === column.name);
        if (!exists) {
          await this.run(column.sql);
          logger.info(`Database migration: added ${column.name} column to tasks table`);
        }
      }

      // Adicionar coluna updatedAt separadamente (sem valor padrão)
      const hasUpdatedAt = taskColumns.some(col => col.name === 'updatedAt');
      if (!hasUpdatedAt) {
        await this.run('ALTER TABLE tasks ADD COLUMN updatedAt DATETIME');
        // Atualizar registros existentes com o timestamp atual
        await this.run('UPDATE tasks SET updatedAt = createdAt WHERE updatedAt IS NULL');
        logger.info('Database migration: added updatedAt column to tasks table');
      }

      // Criar índices para melhor performance
      await this.createIndexes();

    } catch (error) {
      logger.error('Database migration failed', { error: error.message });
      throw error;
    }
  }

  async createIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tasks_userid ON tasks(userId)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_duedate ON tasks(dueDate)',
      'CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(createdAt)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)'
    ];

    for (const index of indexes) {
      try {
        await this.run(index);
      } catch (error) {
        // Índice já existe, ignorar erro
        logger.debug('Index already exists', { index });
      }
    }
  }

  // Métodos auxiliares para promisificar SQLite
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  // Método para executar transações
  async transaction(callback) {
    try {
      await this.run('BEGIN TRANSACTION');
      const result = await callback();
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      throw error;
    }
  }

  // Método para fechar conexão
  close() {
    if (this.db) {
      this.db.close();
      logger.info('Database connection closed');
    }
  }
}

module.exports = new Database();
