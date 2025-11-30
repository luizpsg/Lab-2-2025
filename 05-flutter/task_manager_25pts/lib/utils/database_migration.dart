import 'package:sqflite/sqflite.dart';

class DatabaseMigration {
  /// Limpa o banco de dados completamente para forçar recriação
  /// Use apenas em desenvolvimento ou quando houver problemas de migração
  static Future<void> resetDatabase(Database db) async {
    await db.execute('DROP TABLE IF EXISTS tasks');
  }

  /// Verifica se uma coluna existe em uma tabela
  static Future<bool> columnExists(
    Database db,
    String tableName,
    String columnName,
  ) async {
    final result = await db.rawQuery('PRAGMA table_info($tableName)');
    return result.any((column) => column['name'] == columnName);
  }

  /// Adiciona coluna categoryId se não existir
  static Future<void> addCategoryIdColumn(Database db) async {
    final exists = await columnExists(db, 'tasks', 'categoryId');
    if (!exists) {
      await db.execute(
        'ALTER TABLE tasks ADD COLUMN categoryId TEXT NOT NULL DEFAULT \'other\'',
      );
    }
  }

  /// Adiciona coluna dueDate se não existir
  static Future<void> addDueDateColumn(Database db) async {
    final exists = await columnExists(db, 'tasks', 'dueDate');
    if (!exists) {
      await db.execute('ALTER TABLE tasks ADD COLUMN dueDate TEXT');
    }
  }

  /// Adiciona coluna reminderTime se não existir
  static Future<void> addReminderTimeColumn(Database db) async {
    final exists = await columnExists(db, 'tasks', 'reminderTime');
    if (!exists) {
      await db.execute('ALTER TABLE tasks ADD COLUMN reminderTime TEXT');
    }
  }
}
