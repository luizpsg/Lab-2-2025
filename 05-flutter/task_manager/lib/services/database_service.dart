import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/task.dart';
import '../utils/database_migration.dart';

class DatabaseService {
  static final DatabaseService instance = DatabaseService._init();
  static Database? _database;

  DatabaseService._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('tasks.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 4,
      onCreate: _createDB,
      onUpgrade: _upgradeDB,
      onOpen: (db) async {
        // Garante que as colunas existem mesmo se a migração falhar
        await DatabaseMigration.addDueDateColumn(db);
        await DatabaseMigration.addCategoryIdColumn(db);
        await DatabaseMigration.addReminderTimeColumn(db);
      },
    );
  }

  Future<void> _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER NOT NULL,
        priority TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        dueDate TEXT,
        categoryId TEXT NOT NULL DEFAULT 'other',
        reminderTime TEXT
      )
    ''');
  }

  Future<void> _upgradeDB(Database db, int oldVersion, int newVersion) async {
    // Migração para versão 2 - adiciona dueDate
    if (oldVersion < 2) {
      await DatabaseMigration.addDueDateColumn(db);
    }

    // Migração para versão 3 - adiciona categoryId
    if (oldVersion < 3) {
      await DatabaseMigration.addCategoryIdColumn(db);
    }

    // Migração para versão 4 - adiciona reminderTime
    if (oldVersion < 4) {
      await DatabaseMigration.addReminderTimeColumn(db);
    }
  }

  Future<Task> create(Task task) async {
    final db = await database;
    await db.insert('tasks', task.toMap());
    return task;
  }

  Future<Task?> read(String id) async {
    final db = await database;
    final maps = await db.query('tasks', where: 'id = ?', whereArgs: [id]);

    if (maps.isNotEmpty) {
      return Task.fromMap(maps.first);
    }
    return null;
  }

  Future<List<Task>> readAll({String? categoryId}) async {
    final db = await database;
    // Ordena por data de vencimento (nulls no final), depois por data de criação
    const orderBy = '''
      CASE 
        WHEN dueDate IS NULL THEN 1 
        ELSE 0 
      END,
      dueDate ASC,
      createdAt DESC
    ''';

    if (categoryId != null) {
      final result = await db.query(
        'tasks',
        where: 'categoryId = ?',
        whereArgs: [categoryId],
        orderBy: orderBy,
      );
      return result.map((map) => Task.fromMap(map)).toList();
    }

    final result = await db.query('tasks', orderBy: orderBy);
    return result.map((map) => Task.fromMap(map)).toList();
  }

  Future<int> update(Task task) async {
    final db = await database;
    return db.update(
      'tasks',
      task.toMap(),
      where: 'id = ?',
      whereArgs: [task.id],
    );
  }

  Future<int> delete(String id) async {
    final db = await database;
    return await db.delete('tasks', where: 'id = ?', whereArgs: [id]);
  }

  /// Limpa todas as tarefas do banco de dados
  /// Use com cuidado - deleta todos os dados!
  Future<void> deleteAllTasks() async {
    final db = await database;
    await db.delete('tasks');
  }

  /// Reseta completamente o banco de dados
  /// Use apenas em caso de problemas de migração
  Future<void> resetDatabase() async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, 'tasks.db');

    // Fecha o banco de dados atual
    if (_database != null) {
      await _database!.close();
      _database = null;
    }

    // Delete o arquivo do banco de dados
    await deleteDatabase(path);

    // Recria o banco de dados
    await database;
  }
}
