import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/task_provider.dart';
import '../models/task.dart';
import '../services/connectivity_service.dart';
import 'task_form_screen.dart';
import 'sync_status_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _connectivity = ConnectivityService.instance;
  bool _isOnline = true;

  @override
  void initState() {
    super.initState();
    _initializeConnectivity();
  }

  Future<void> _initializeConnectivity() async {
    await _connectivity.initialize();
    setState(() => _isOnline = _connectivity.isOnline);

    // Escutar mudanças de conectividade
    _connectivity.connectivityStream.listen((isOnline) {
      setState(() => _isOnline = isOnline);

      if (isOnline) {
        _showSnackBar('🟢 Conectado - Sincronizando...', Colors.green);
        // ignore: use_build_context_synchronously
        context.read<TaskProvider>().sync();
      } else {
        _showSnackBar('🔴 Modo Offline', Colors.orange);
      }
    });
  }

  void _showSnackBar(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: color,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final titleStyle = Theme.of(context).textTheme.titleMedium;

    return Scaffold(
      extendBody: true,
      appBar: AppBar(
        title: const Text('Tarefas Offline-First'),
        actions: [
          _buildConnectivityIndicator(context),
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: _isOnline ? _handleManualSync : null,
            tooltip: 'Sincronizar',
          ),
          IconButton(
            icon: const Icon(Icons.info_outline),
            onPressed: () => _navigateToSyncStatus(),
            tooltip: 'Status de Sincronização',
          ),
        ],
      ),
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF0B0F16), Color(0xFF111827), Color(0xFF0F1624)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: Consumer<TaskProvider>(
          builder: (context, taskProvider, child) {
            if (taskProvider.isLoading) {
              return const Center(child: CircularProgressIndicator());
            }

            if (taskProvider.error != null) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
                    const SizedBox(height: 16),
                    Text('Erro: ${taskProvider.error}'),
                    const SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: () => taskProvider.loadTasks(),
                      child: const Text('Tentar Novamente'),
                    ),
                  ],
                ),
              );
            }

            final tasks = taskProvider.tasks;

            if (tasks.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.terminal,
                      size: 64,
                      color: Colors.grey[500],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Nenhuma tarefa',
                      style: titleStyle?.copyWith(color: Colors.grey[300]),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Use o + para compilar a primeira missão.',
                      style: TextStyle(color: Colors.grey[500]),
                    ),
                  ],
                ),
              );
            }

            return RefreshIndicator(
              color: colorScheme.primary,
              onRefresh: () => taskProvider.sync(),
              child: ListView.separated(
                itemCount: tasks.length,
                padding: const EdgeInsets.all(16),
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (context, index) {
                  final task = tasks[index];
                  return _buildTaskCard(context, task, taskProvider);
                },
              ),
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _navigateToTaskForm,
        child: const Icon(Icons.add),
        tooltip: 'Nova Tarefa',
      ),
    );
  }

  Widget _buildConnectivityIndicator(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: Center(
        child: Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: _isOnline ? colorScheme.primary : colorScheme.error,
            boxShadow: [
              BoxShadow(
                color: (_isOnline ? colorScheme.primary : colorScheme.error)
                    .withOpacity(0.7),
                blurRadius: 6,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTaskCard(
      BuildContext context, Task task, TaskProvider provider) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      margin: EdgeInsets.zero,
      child: Container(
        decoration: BoxDecoration(
          border: Border(
            left: BorderSide(
              color:
                  task.completed ? Colors.greenAccent : colorScheme.secondary,
              width: 3,
            ),
          ),
        ),
        child: ListTile(
          leading: Transform.scale(
            scale: 1.1,
            child: Checkbox(
              value: task.completed,
              onChanged: (_) => provider.toggleCompleted(task),
              activeColor: colorScheme.primary,
            ),
          ),
          title: Text(
            task.title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  decoration:
                      task.completed ? TextDecoration.lineThrough : null,
                  fontWeight: FontWeight.w600,
                ),
          ),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (task.description.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    task.description,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildPriorityBadge(context, task.priority),
                  const SizedBox(width: 8),
                  _buildSyncStatusBadge(context, task.syncStatus),
                ],
              ),
            ],
          ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(
                icon: const Icon(Icons.edit),
                onPressed: () => _navigateToTaskForm(task: task),
              ),
              IconButton(
                icon: const Icon(Icons.delete),
                onPressed: () => _confirmDelete(task, provider),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPriorityBadge(BuildContext context, String priority) {
    final colorScheme = Theme.of(context).colorScheme;
    Color color;
    switch (priority) {
      case 'urgent':
        color = Colors.pinkAccent;
        break;
      case 'high':
        color = colorScheme.secondary;
        break;
      case 'medium':
        color = colorScheme.primary;
        break;
      case 'low':
        color = Colors.greenAccent;
        break;
      default:
        color = Colors.blueGrey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.7)),
        color: color.withOpacity(0.12),
      ),
      child: Text(
        priority.toUpperCase(),
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          letterSpacing: 1.1,
          color: color,
        ),
      ),
    );
  }

  Widget _buildSyncStatusBadge(BuildContext context, SyncStatus status) {
    final colorScheme = Theme.of(context).colorScheme;
    final Map<SyncStatus, Color> colors = {
      SyncStatus.synced: Colors.greenAccent,
      SyncStatus.pending: colorScheme.secondary,
      SyncStatus.conflict: Colors.orangeAccent,
      SyncStatus.error: Colors.redAccent,
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        gradient: LinearGradient(
          colors: [
            colors[status]!.withOpacity(0.15),
            colors[status]!.withOpacity(0.35),
          ],
        ),
        border: Border.all(color: colors[status]!.withOpacity(0.6)),
      ),
      child: Text(
        status.icon,
        style: const TextStyle(fontSize: 12),
      ),
    );
  }

  Future<void> _handleManualSync() async {
    final provider = context.read<TaskProvider>();

    _showSnackBar('🔄 Sincronizando...', Colors.blue);

    final result = await provider.sync();

    if (result.success) {
      _showSnackBar(
        '✅ Sincronização concluída',
        Colors.green,
      );
    } else {
      _showSnackBar(
        '❌ Erro na sincronização',
        Colors.red,
      );
    }
  }

  void _navigateToTaskForm({Task? task}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => TaskFormScreen(task: task),
      ),
    );
  }

  void _navigateToSyncStatus() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => const SyncStatusScreen(),
      ),
    );
  }

  Future<void> _confirmDelete(Task task, TaskProvider provider) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirmar exclusão'),
        content: Text('Deseja deletar "${task.title}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Deletar'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await provider.deleteTask(task.id);
      if (mounted) {
        _showSnackBar('🗑️ Tarefa deletada', Colors.grey);
      }
    }
  }
}
