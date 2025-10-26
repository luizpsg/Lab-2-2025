import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/task.dart';
import '../models/category.dart';
import '../services/database_service.dart';
import '../services/notification_service.dart';

class TaskFormScreen extends StatefulWidget {
  final Task? task; // null = criar novo, não-null = editar

  const TaskFormScreen({super.key, this.task});

  @override
  State<TaskFormScreen> createState() => _TaskFormScreenState();
}

class _TaskFormScreenState extends State<TaskFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();

  String _priority = 'medium';
  bool _completed = false;
  bool _isLoading = false;
  DateTime? _dueDate;
  String _categoryId = 'other';
  DateTime? _reminderTime;

  @override
  void initState() {
    super.initState();

    // Se estiver editando, preencher campos
    if (widget.task != null) {
      _titleController.text = widget.task!.title;
      _descriptionController.text = widget.task!.description;
      _priority = widget.task!.priority;
      _completed = widget.task!.completed;
      _dueDate = widget.task!.dueDate;
      _categoryId = widget.task!.categoryId;
      _reminderTime = widget.task!.reminderTime;
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _saveTask() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      if (widget.task == null) {
        // Criar nova tarefa
        final newTask = Task(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          priority: _priority,
          completed: _completed,
          dueDate: _dueDate,
          categoryId: _categoryId,
          reminderTime: _reminderTime,
        );
        await DatabaseService.instance.create(newTask);

        // Agendar notificação se houver lembrete
        if (newTask.reminderTime != null) {
          await NotificationService.instance.scheduleNotification(
            id: NotificationService.getNotificationId(newTask.id),
            title: '⏰ Lembrete: ${newTask.title}',
            body: newTask.description.isEmpty
                ? 'Você tem uma tarefa pendente'
                : newTask.description,
            scheduledDate: newTask.reminderTime!,
          );
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✓ Tarefa criada com sucesso'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 2),
            ),
          );
        }
      } else {
        // Atualizar tarefa existente
        final updatedTask = widget.task!.copyWith(
          title: _titleController.text.trim(),
          description: _descriptionController.text.trim(),
          priority: _priority,
          completed: _completed,
          dueDate: _dueDate,
          clearDueDate: _dueDate == null,
          categoryId: _categoryId,
          reminderTime: _reminderTime,
          clearReminderTime: _reminderTime == null,
        );
        await DatabaseService.instance.update(updatedTask);

        // Cancela notificação antiga
        await NotificationService.instance.cancelNotification(
          NotificationService.getNotificationId(updatedTask.id),
        );

        // Agenda nova notificação se houver lembrete
        if (updatedTask.reminderTime != null && !updatedTask.completed) {
          await NotificationService.instance.scheduleNotification(
            id: NotificationService.getNotificationId(updatedTask.id),
            title: '⏰ Lembrete: ${updatedTask.title}',
            body: updatedTask.description.isEmpty
                ? 'Você tem uma tarefa pendente'
                : updatedTask.description,
            scheduledDate: updatedTask.reminderTime!,
          );
        }

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('✓ Tarefa atualizada com sucesso'),
              backgroundColor: Color.fromARGB(255, 61, 168, 114),
              duration: Duration(seconds: 2),
            ),
          );
        }
      }

      if (mounted) {
        Navigator.pop(context, true); // Retorna true = sucesso
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao salvar: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.task != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Editar Tarefa' : 'Nova Tarefa'),
        backgroundColor: Color.fromARGB(255, 61, 168, 114),
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Campo de Título
                    TextFormField(
                      controller: _titleController,
                      decoration: const InputDecoration(
                        labelText: 'Título *',
                        hintText: 'Ex: Estudar Flutter',
                        prefixIcon: Icon(Icons.title),
                        border: OutlineInputBorder(),
                      ),
                      textCapitalization: TextCapitalization.sentences,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Por favor, digite um título';
                        }
                        if (value.trim().length < 3) {
                          return 'Título deve ter pelo menos 3 caracteres';
                        }
                        return null;
                      },
                      maxLength: 100,
                    ),

                    const SizedBox(height: 16),

                    // Campo de Descrição
                    TextFormField(
                      controller: _descriptionController,
                      decoration: const InputDecoration(
                        labelText: 'Descrição',
                        hintText: 'Adicione mais detalhes...',
                        prefixIcon: Icon(Icons.description),
                        border: OutlineInputBorder(),
                        alignLabelWithHint: true,
                      ),
                      textCapitalization: TextCapitalization.sentences,
                      maxLines: 5,
                      maxLength: 500,
                    ),

                    const SizedBox(height: 16),

                    // Dropdown de Categoria
                    DropdownButtonFormField<String>(
                      value: _categoryId,
                      decoration: const InputDecoration(
                        labelText: 'Categoria',
                        prefixIcon: Icon(Icons.category),
                        border: OutlineInputBorder(),
                      ),
                      items: Categories.all.map((category) {
                        return DropdownMenuItem(
                          value: category.id,
                          child: Row(
                            children: [
                              Icon(
                                Categories.getIconData(category.icon),
                                color: category.color,
                                size: 20,
                              ),
                              const SizedBox(width: 12),
                              Text(category.name),
                            ],
                          ),
                        );
                      }).toList(),
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _categoryId = value);
                        }
                      },
                    ),

                    const SizedBox(height: 16),

                    // Dropdown de Prioridade
                    DropdownButtonFormField<String>(
                      value: _priority,
                      decoration: const InputDecoration(
                        labelText: 'Prioridade',
                        prefixIcon: Icon(Icons.flag),
                        border: OutlineInputBorder(),
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'low',
                          child: Row(
                            children: [
                              Icon(Icons.flag, color: Colors.green),
                              SizedBox(width: 8),
                              Text('Baixa'),
                            ],
                          ),
                        ),
                        DropdownMenuItem(
                          value: 'medium',
                          child: Row(
                            children: [
                              Icon(Icons.flag, color: Colors.orange),
                              SizedBox(width: 8),
                              Text('Média'),
                            ],
                          ),
                        ),
                        DropdownMenuItem(
                          value: 'high',
                          child: Row(
                            children: [
                              Icon(Icons.flag, color: Colors.red),
                              SizedBox(width: 8),
                              Text('Alta'),
                            ],
                          ),
                        ),
                        DropdownMenuItem(
                          value: 'urgent',
                          child: Row(
                            children: [
                              Icon(Icons.flag, color: Colors.purple),
                              SizedBox(width: 8),
                              Text('Urgente'),
                            ],
                          ),
                        ),
                      ],
                      onChanged: (value) {
                        if (value != null) {
                          setState(() => _priority = value);
                        }
                      },
                    ),

                    const SizedBox(height: 16),

                    // Data de Vencimento
                    Card(
                      child: ListTile(
                        leading: Icon(
                          Icons.calendar_today,
                          color: _dueDate != null
                              ? Color.fromARGB(255, 61, 168, 114)
                              : Colors.grey,
                        ),
                        title: const Text('Data de Vencimento'),
                        subtitle: Text(
                          _dueDate != null
                              ? DateFormat('dd/MM/yyyy').format(_dueDate!)
                              : 'Nenhuma data definida',
                          style: TextStyle(
                            color:
                                _dueDate != null &&
                                    _dueDate!.isBefore(DateTime.now())
                                ? Colors.red
                                : null,
                          ),
                        ),
                        trailing: _dueDate != null
                            ? IconButton(
                                icon: const Icon(Icons.clear),
                                onPressed: () {
                                  setState(() => _dueDate = null);
                                },
                                tooltip: 'Remover data',
                              )
                            : null,
                        onTap: () async {
                          final date = await showDatePicker(
                            context: context,
                            initialDate: _dueDate ?? DateTime.now(),
                            firstDate: DateTime.now().subtract(
                              const Duration(days: 365),
                            ),
                            lastDate: DateTime.now().add(
                              const Duration(days: 365 * 5),
                            ),
                            helpText: 'Selecione a data de vencimento',
                            cancelText: 'Cancelar',
                            confirmText: 'Confirmar',
                          );

                          if (date != null) {
                            setState(() => _dueDate = date);
                          }
                        },
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Lembrete
                    Card(
                      child: ListTile(
                        leading: Icon(
                          Icons.alarm,
                          color: _reminderTime != null
                              ? Color.fromARGB(255, 61, 168, 114)
                              : Colors.grey,
                        ),
                        title: const Text('Lembrete'),
                        subtitle: Text(
                          _reminderTime != null
                              ? DateFormat(
                                  'dd/MM/yyyy HH:mm',
                                ).format(_reminderTime!)
                              : 'Nenhum lembrete configurado',
                          style: TextStyle(
                            color:
                                _reminderTime != null &&
                                    _reminderTime!.isBefore(DateTime.now())
                                ? Colors.red
                                : null,
                          ),
                        ),
                        trailing: _reminderTime != null
                            ? IconButton(
                                icon: const Icon(Icons.clear),
                                onPressed: () {
                                  setState(() => _reminderTime = null);
                                },
                                tooltip: 'Remover lembrete',
                              )
                            : null,
                        onTap: () async {
                          // Primeiro seleciona a data
                          final date = await showDatePicker(
                            context: context,
                            initialDate: _reminderTime ?? DateTime.now(),
                            firstDate: DateTime.now(),
                            lastDate: DateTime.now().add(
                              const Duration(days: 365 * 5),
                            ),
                            helpText: 'Selecione a data do lembrete',
                            cancelText: 'Cancelar',
                            confirmText: 'Confirmar',
                          );

                          if (date != null && mounted) {
                            // Depois seleciona a hora
                            final time = await showTimePicker(
                              context: context,
                              initialTime: TimeOfDay.fromDateTime(
                                _reminderTime ?? DateTime.now(),
                              ),
                              helpText: 'Selecione a hora do lembrete',
                              cancelText: 'Cancelar',
                              confirmText: 'Confirmar',
                            );

                            if (time != null) {
                              setState(() {
                                _reminderTime = DateTime(
                                  date.year,
                                  date.month,
                                  date.day,
                                  time.hour,
                                  time.minute,
                                );
                              });
                            }
                          }
                        },
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Switch de Completo
                    Card(
                      child: SwitchListTile(
                        title: const Text('Tarefa Completa'),
                        subtitle: Text(
                          _completed
                              ? 'Esta tarefa está marcada como concluída'
                              : 'Esta tarefa ainda não foi concluída',
                        ),
                        value: _completed,
                        onChanged: (value) {
                          setState(() => _completed = value);
                        },
                        secondary: Icon(
                          _completed
                              ? Icons.check_circle
                              : Icons.radio_button_unchecked,
                          color: _completed ? Colors.green : Colors.grey,
                        ),
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Botão Salvar
                    ElevatedButton.icon(
                      onPressed: _saveTask,
                      icon: const Icon(Icons.save),
                      label: Text(
                        isEditing ? 'Atualizar Tarefa' : 'Criar Tarefa',
                      ),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                        backgroundColor: Color.fromARGB(255, 61, 168, 114),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),

                    const SizedBox(height: 8),

                    // Botão Cancelar
                    OutlinedButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.cancel),
                      label: const Text('Cancelar'),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.all(16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
