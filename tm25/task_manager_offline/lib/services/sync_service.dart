import 'dart:async';
import 'dart:io';
import '../models/task.dart';
import '../models/sync_operation.dart';
import 'database_service.dart';
import 'api_service.dart';
import 'connectivity_service.dart';

/// Motor de Sincronização Offline-First
///
/// Implementa sincronização simples usando estratégia Last-Write-Wins (LWW)
class SyncService {
  final DatabaseService _db = DatabaseService.instance;
  final ApiService _api;
  final ConnectivityService _connectivity = ConnectivityService.instance;

  bool _isSyncing = false;
  Timer? _autoSyncTimer;

  final _syncStatusController = StreamController<SyncEvent>.broadcast();
  Stream<SyncEvent> get syncStatusStream => _syncStatusController.stream;

  SyncService({String userId = 'user1'}) : _api = ApiService(userId: userId);

  // ==================== SINCRONIZAÇÃO PRINCIPAL ====================

  /// Executar sincronização completa
  Future<SyncResult> sync() async {
    if (_isSyncing) {
      print('⏳ Sincronização já em andamento');
      return SyncResult(
        success: false,
        message: 'Sincronização já em andamento',
      );
    }

    if (!_connectivity.isOnline) {
      print('📴 Sem conectividade - operações enfileiradas');
      return SyncResult(
        success: false,
        message: 'Sem conexão com internet',
      );
    }

    _isSyncing = true;
    _notifyStatus(SyncEvent.syncStarted());

    try {
      print('🔄 Iniciando sincronização...');

      // 1. Push: Enviar operações pendentes
      final pushResult = await _pushPendingOperations();

      // 2. Pull: Buscar atualizações do servidor
      final pullResult = await _pullFromServer();

      // 3. Atualizar timestamp de última sync
      await _db.setMetadata(
        'lastSyncTimestamp',
        DateTime.now().millisecondsSinceEpoch.toString(),
      );

      print('✅ Sincronização concluída');
      _notifyStatus(SyncEvent.syncCompleted(
        pushedCount: pushResult,
        pulledCount: pullResult,
      ));

      return SyncResult(
        success: true,
        message: 'Sincronização concluída com sucesso',
        pushedOperations: pushResult,
        pulledTasks: pullResult,
      );
    } catch (e) {
      final isNetworkIssue = _isNetworkError(e);
      final errorMessage = isNetworkIssue
          ? 'Servidor indisponível - operações continuarão na fila'
          : 'Erro na sincronização: $e';

      print('❌ Erro na sincronização: $e');
      _notifyStatus(SyncEvent.syncError(errorMessage));

      return SyncResult(
        success: false,
        message: errorMessage,
      );
    } finally {
      _isSyncing = false;
    }
  }

  // ==================== PUSH (Cliente → Servidor) ====================

  /// Enviar operações pendentes para o servidor
  Future<int> _pushPendingOperations() async {
    final operations = await _db.getPendingSyncOperations();
    print('📤 Enviando ${operations.length} operações pendentes');

    int successCount = 0;

    for (final operation in operations) {
      try {
        await _processOperation(operation);
        await _db.removeSyncOperation(operation.id);
        successCount++;
      } catch (e) {
        await _handleOperationError(operation, e);

        if (_isNetworkError(e)) {
          rethrow;
        }
      }
    }

    return successCount;
  }

  /// Processar operação individual
  Future<void> _processOperation(SyncOperation operation) async {
    switch (operation.type) {
      case OperationType.create:
        await _pushCreate(operation);
        break;
      case OperationType.update:
        await _pushUpdate(operation);
        break;
      case OperationType.delete:
        await _pushDelete(operation);
        break;
    }
  }

  Future<void> _pushCreate(SyncOperation operation) async {
    Task? task = await _db.getTask(operation.taskId);
    task ??= _taskFromOperation(operation);

    if (task == null) {
      throw Exception(
        'Dados indisponíveis para criar tarefa ${operation.taskId}',
      );
    }

    final serverTask = await _api.createTask(task);

    // Atualizar tarefa local com dados do servidor
    await _db.upsertTask(
      task.copyWith(
        version: serverTask.version,
        updatedAt: serverTask.updatedAt,
        syncStatus: SyncStatus.synced,
      ),
    );
  }

  Future<void> _pushUpdate(SyncOperation operation) async {
    Task? task = await _db.getTask(operation.taskId);
    task ??= _taskFromOperation(operation);

    if (task == null) {
      throw Exception(
        'Dados indisponíveis para atualizar tarefa ${operation.taskId}',
      );
    }

    print(
        '📤 Enviando update: ${task.id} (v${task.version}, local: ${task.localUpdatedAt})');

    final result = await _api.updateTask(task);

    if (result['conflict'] == true) {
      // Conflito detectado - aplicar Last-Write-Wins baseado em timestamp
      final serverTask = result['serverTask'] as Task;
      print(
          '⚠️ Conflito de versão no push: local v${task.version} vs servidor v${serverTask.version}');
      await _resolveConflict(task, serverTask);
    } else {
      // Sucesso - atualizar local com dados do servidor
      final updatedTask = result['task'] as Task;
      await _db.upsertTask(
        task.copyWith(
          version: updatedTask.version,
          updatedAt: updatedTask.updatedAt,
          syncStatus: SyncStatus.synced,
        ),
      );
    }
  }

  Future<void> _pushDelete(SyncOperation operation) async {
    final task = await _db.getTask(operation.taskId);
    final operationVersion = _extractVersion(operation.data);
    final version = task?.version ?? operationVersion ?? 1;

    await _api.deleteTask(operation.taskId, version);
    await _db.deleteTask(operation.taskId);
  }

  // ==================== PULL (Servidor → Cliente) ====================

  /// Buscar atualizações do servidor
  Future<int> _pullFromServer() async {
    final lastSyncStr = await _db.getMetadata('lastSyncTimestamp');
    final lastSync = lastSyncStr != null ? int.parse(lastSyncStr) : null;

    final result = await _api.getTasks(modifiedSince: lastSync);
    final serverTasks = result['tasks'] as List<Task>;

    print('📥 Recebidas ${serverTasks.length} tarefas do servidor');

    for (final serverTask in serverTasks) {
      final localTask = await _db.getTask(serverTask.id);

      if (localTask == null) {
        // Nova tarefa do servidor
        await _db.upsertTask(
          serverTask.copyWith(syncStatus: SyncStatus.synced),
        );
      } else if (localTask.syncStatus == SyncStatus.synced) {
        // Tarefa local está sincronizada - verificar timestamps para LWW
        final localTime = localTask.localUpdatedAt ?? localTask.updatedAt;
        final serverTime = serverTask.updatedAt;

        if (serverTime.isAfter(localTime)) {
          // Servidor é mais recente - sobrescrever local
          print(
              '📥 Servidor mais recente para ${serverTask.id} - atualizando local');
          await _db.upsertTask(
            serverTask.copyWith(syncStatus: SyncStatus.synced),
          );
        } else {
          // Local é mais recente ou igual - manter local e atualizar version
          print('📥 Local mais recente para ${serverTask.id} - mantendo local');
          await _db.upsertTask(
            localTask.copyWith(
              version: serverTask.version,
              syncStatus: SyncStatus.synced,
            ),
          );
        }
      } else {
        // Possível conflito - resolver
        await _resolveConflict(localTask, serverTask);
      }
    }

    return serverTasks.length;
  }

  // ==================== RESOLUÇÃO DE CONFLITOS (LWW) ====================

  /// Resolver conflito usando Last-Write-Wins
  Future<void> _resolveConflict(Task localTask, Task serverTask) async {
    print('⚠️ Conflito detectado: ${localTask.id}');
    print(
        '   Local: ${localTask.localUpdatedAt ?? localTask.updatedAt} (v${localTask.version})');
    print('   Servidor: ${serverTask.updatedAt} (v${serverTask.version})');

    final localTime = localTask.localUpdatedAt ?? localTask.updatedAt;
    final serverTime = serverTask.updatedAt;

    Task winningTask;
    String reason;

    if (localTime.isAfter(serverTime)) {
      // Versão local vence - precisa enviar para o servidor com a version correta
      reason = 'Modificação local é mais recente';
      print('🏆 LWW: Versão local vence');

      // Usar a version do servidor para evitar conflito de versão
      final taskToSend = localTask.copyWith(
        version: serverTask.version,
        updatedAt: localTask.localUpdatedAt ?? localTask.updatedAt,
      );

      final result = await _api.updateTask(taskToSend);
      if (result['conflict'] == true) {
        // Ainda há conflito - tentar forçar com version incrementada
        print('⚠️ Conflito persistente - forçando atualização');
        final serverVersion = (result['serverTask'] as Task).version;
        final forcedTask = localTask.copyWith(version: serverVersion);
        final retryResult = await _api.updateTask(forcedTask);

        if (retryResult['conflict'] == true) {
          // Se ainda falhar, manter local como vencedor
          winningTask = localTask.copyWith(
            version: serverVersion + 1,
            syncStatus: SyncStatus.synced,
          );
        } else {
          winningTask = retryResult['task'] as Task;
        }
      } else {
        winningTask = result['task'] as Task;
      }
    } else {
      // Versão servidor vence
      winningTask = serverTask;
      reason = 'Modificação do servidor é mais recente';
      print('🏆 LWW: Versão servidor vence');
    }

    // Atualizar banco local com versão vencedora
    await _db.upsertTask(
      winningTask.copyWith(syncStatus: SyncStatus.synced),
    );

    _notifyStatus(SyncEvent.conflictResolved(
      taskId: localTask.id,
      resolution: reason,
    ));
  }

  // ==================== OPERAÇÕES COM FILA ====================

  /// Criar tarefa (com suporte offline)
  Future<Task> createTask(Task task) async {
    // Salvar localmente
    final savedTask = await _db.upsertTask(
      task.copyWith(
        syncStatus: SyncStatus.pending,
        localUpdatedAt: DateTime.now(),
      ),
    );

    // Adicionar à fila de sincronização
    await _db.addToSyncQueue(
      SyncOperation(
        type: OperationType.create,
        taskId: savedTask.id,
        data: savedTask.toMap(),
      ),
    );

    // Tentar sincronizar imediatamente se online
    if (_connectivity.isOnline) {
      sync();
    }

    return savedTask;
  }

  /// Atualizar tarefa (com suporte offline)
  Future<Task> updateTask(Task task) async {
    // Salvar localmente
    final updatedTask = await _db.upsertTask(
      task.copyWith(
        syncStatus: SyncStatus.pending,
        localUpdatedAt: DateTime.now(),
      ),
    );

    // Adicionar à fila de sincronização
    await _db.addToSyncQueue(
      SyncOperation(
        type: OperationType.update,
        taskId: updatedTask.id,
        data: updatedTask.toMap(),
      ),
    );

    // Tentar sincronizar imediatamente se online
    if (_connectivity.isOnline) {
      sync();
    }

    return updatedTask;
  }

  /// Deletar tarefa (com suporte offline)
  Future<void> deleteTask(String taskId) async {
    final task = await _db.getTask(taskId);
    if (task == null) return;

    // Adicionar à fila de sincronização antes de deletar
    await _db.addToSyncQueue(
      SyncOperation(
        type: OperationType.delete,
        taskId: taskId,
        data: {'version': task.version},
      ),
    );

    // Deletar localmente
    await _db.deleteTask(taskId);

    // Tentar sincronizar imediatamente se online
    if (_connectivity.isOnline) {
      sync();
    }
  }

  // ==================== SINCRONIZAÇÃO AUTOMÁTICA ====================

  /// Iniciar sincronização automática
  void startAutoSync({Duration interval = const Duration(seconds: 30)}) {
    stopAutoSync(); // Parar timer anterior se existir

    _autoSyncTimer = Timer.periodic(interval, (timer) {
      if (_connectivity.isOnline && !_isSyncing) {
        print('🔄 Auto-sync iniciado');
        sync();
      }
    });

    print('✅ Auto-sync configurado (intervalo: ${interval.inSeconds}s)');
  }

  /// Parar sincronização automática
  void stopAutoSync() {
    _autoSyncTimer?.cancel();
    _autoSyncTimer = null;
  }

  // ==================== NOTIFICAÇÕES ====================

  void _notifyStatus(SyncEvent event) {
    _syncStatusController.add(event);
  }

  // ==================== ESTATÍSTICAS ====================

  Future<SyncStats> getStats() async {
    final dbStats = await _db.getStats();
    final lastSyncStr = await _db.getMetadata('lastSyncTimestamp');
    final lastSync = lastSyncStr != null
        ? DateTime.fromMillisecondsSinceEpoch(int.parse(lastSyncStr))
        : null;

    return SyncStats(
      totalTasks: dbStats['totalTasks'],
      unsyncedTasks: dbStats['unsyncedTasks'],
      queuedOperations: dbStats['queuedOperations'],
      lastSync: lastSync,
      isOnline: _connectivity.isOnline,
      isSyncing: _isSyncing,
    );
  }

  // ==================== SUPORTE INTERNO ====================

  Future<void> _handleOperationError(
    SyncOperation operation,
    Object error,
  ) async {
    print('❌ Erro ao processar operação ${operation.id}: $error');

    final updatedOperation = operation.copyWith(
      retries: operation.retries + 1,
      error: error.toString(),
    );

    await _db.updateSyncOperation(updatedOperation);

    if (updatedOperation.retries >= 3) {
      await _db.updateSyncOperation(
        updatedOperation.copyWith(status: SyncOperationStatus.failed),
      );
    }
  }

  bool _isNetworkError(Object error) {
    return error is TimeoutException || error is SocketException;
  }

  Task? _taskFromOperation(SyncOperation operation) {
    if (operation.data.isEmpty) return null;

    try {
      return Task.fromMap(operation.data);
    } catch (e) {
      print('❌ Erro ao reconstruir tarefa ${operation.taskId}: $e');
      return null;
    }
  }

  int? _extractVersion(Map<String, dynamic> data) {
    final rawVersion = data['version'];

    if (rawVersion is int) return rawVersion;
    if (rawVersion is String) {
      return int.tryParse(rawVersion);
    }

    return null;
  }

  // ==================== LIMPEZA ====================

  void dispose() {
    stopAutoSync();
    _syncStatusController.close();
  }
}

// ==================== MODELOS DE SUPORTE ====================

/// Resultado de sincronização
class SyncResult {
  final bool success;
  final String message;
  final int? pushedOperations;
  final int? pulledTasks;

  SyncResult({
    required this.success,
    required this.message,
    this.pushedOperations,
    this.pulledTasks,
  });
}

/// Evento de sincronização
class SyncEvent {
  final SyncEventType type;
  final String? message;
  final Map<String, dynamic>? data;

  SyncEvent({
    required this.type,
    this.message,
    this.data,
  });

  factory SyncEvent.syncStarted() => SyncEvent(type: SyncEventType.started);

  factory SyncEvent.syncCompleted({int? pushedCount, int? pulledCount}) =>
      SyncEvent(
        type: SyncEventType.completed,
        data: {'pushed': pushedCount, 'pulled': pulledCount},
      );

  factory SyncEvent.syncError(String error) => SyncEvent(
        type: SyncEventType.error,
        message: error,
      );

  factory SyncEvent.conflictResolved({
    required String taskId,
    required String resolution,
  }) =>
      SyncEvent(
        type: SyncEventType.conflictResolved,
        message: resolution,
        data: {'taskId': taskId},
      );
}

enum SyncEventType {
  started,
  completed,
  error,
  conflictResolved,
}

/// Estatísticas de sincronização
class SyncStats {
  final int totalTasks;
  final int unsyncedTasks;
  final int queuedOperations;
  final DateTime? lastSync;
  final bool isOnline;
  final bool isSyncing;

  SyncStats({
    required this.totalTasks,
    required this.unsyncedTasks,
    required this.queuedOperations,
    this.lastSync,
    required this.isOnline,
    required this.isSyncing,
  });
}
