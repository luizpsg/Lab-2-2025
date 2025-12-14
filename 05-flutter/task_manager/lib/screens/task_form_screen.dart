import 'dart:io';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/task.dart';
import '../models/category.dart';
import '../services/database_service.dart';
import '../services/notification_service.dart';
import '../services/camera_service.dart';
import '../services/location_service.dart';
import '../services/cloud_service.dart';
import '../widgets/location_picker.dart';

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

  // CÂMERA
  String? _photoPath; // Mantido para compatibilidade
  List<String> _photoPaths = [];

  // GPS
  double? _latitude;
  double? _longitude;
  String? _locationName;

  // CLOUD
  List<String> _cloudPhotoUrls = [];
  List<String> _cloudPhotoKeys = [];
  bool _syncToCloud = true; // Sincronizar com LocalStack por padrão
  bool _isUploadingToCloud = false;

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
      _photoPath = widget.task!.photoPath;
      _photoPaths = List.from(widget.task!.photoPaths);
      _latitude = widget.task!.latitude;
      _longitude = widget.task!.longitude;
      _locationName = widget.task!.locationName;
      _cloudPhotoUrls = List.from(widget.task!.cloudPhotoUrls);
      _cloudPhotoKeys = List.from(widget.task!.cloudPhotoKeys);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  // CÂMERA METHODS
  Future<void> _showPhotoOptions() async {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const Text(
                'Escolha uma opção',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.camera_alt, color: Colors.blue),
                ),
                title: const Text('Tirar Foto'),
                subtitle: const Text('Usar a câmera do dispositivo'),
                onTap: () {
                  Navigator.pop(context);
                  _takePicture();
                },
              ),
              const SizedBox(height: 8),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.purple.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.photo_library, color: Colors.purple),
                ),
                title: const Text('Escolher da Galeria'),
                subtitle: const Text('Selecionar foto existente'),
                onTap: () {
                  Navigator.pop(context);
                  _pickFromGallery();
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _takePicture() async {
    final photoPath = await CameraService.instance.takePicture(context);

    if (photoPath != null && mounted) {
      setState(() {
        _photoPaths.add(photoPath);
        _photoPath = photoPath; // Mantém compatibilidade
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('📷 Foto capturada!'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 2),
        ),
      );
    }
  }

  Future<void> _pickFromGallery() async {
    final photoPath = await CameraService.instance.pickFromGallery(context);

    if (photoPath != null && mounted) {
      setState(() {
        _photoPaths.add(photoPath);
        _photoPath = photoPath; // Mantém compatibilidade
      });
    }
  }

  void _removePhoto(int index) {
    setState(() {
      _photoPaths.removeAt(index);
      _photoPath = _photoPaths.isNotEmpty ? _photoPaths.last : null;
    });
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('🗑️ Foto removida')));
  }

  void _removeAllPhotos() {
    setState(() {
      _photoPaths.clear();
      _photoPath = null;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('🗑️ Todas as fotos removidas')),
    );
  }

  void _viewPhoto(String photoPath, int index) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => Scaffold(
          backgroundColor: Colors.black,
          appBar: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            title: Text('Foto ${index + 1} de ${_photoPaths.length}'),
            actions: [
              IconButton(
                icon: const Icon(Icons.delete),
                onPressed: () {
                  Navigator.pop(context);
                  _removePhoto(index);
                },
              ),
            ],
          ),
          body: Center(
            child: InteractiveViewer(
              child: Image.file(File(photoPath), fit: BoxFit.contain),
            ),
          ),
        ),
      ),
    );
  }

  // GPS METHODS
  void _showLocationPicker() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: SingleChildScrollView(
          child: LocationPicker(
            initialLatitude: _latitude,
            initialLongitude: _longitude,
            initialAddress: _locationName,
            onLocationSelected: (lat, lon, address) {
              setState(() {
                _latitude = lat;
                _longitude = lon;
                _locationName = address;
              });
              Navigator.pop(context);
            },
          ),
        ),
      ),
    );
  }

  void _removeLocation() {
    setState(() {
      _latitude = null;
      _longitude = null;
      _locationName = null;
    });
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('📍 Localização removida')));
  }

  // CLOUD METHODS
  Future<void> _uploadPhotosToCloud() async {
    if (!await CloudService.instance.isOnline()) {
      print('⚠️ Backend offline, pulando upload para cloud');
      return;
    }

    setState(() => _isUploadingToCloud = true);

    try {
      // Fazer upload apenas das fotos que ainda não estão na cloud
      for (int i = 0; i < _photoPaths.length; i++) {
        final localPath = _photoPaths[i];

        // Verificar se já tem uma URL correspondente
        if (i < _cloudPhotoUrls.length && _cloudPhotoUrls[i].isNotEmpty) {
          continue; // Já foi feito upload
        }

        final result = await CameraService.instance.uploadToCloud(localPath);

        if (result.success &&
            result.cloudUrl != null &&
            result.cloudKey != null) {
          // Adicionar ou atualizar nas listas
          if (i < _cloudPhotoUrls.length) {
            _cloudPhotoUrls[i] = result.cloudUrl!;
            _cloudPhotoKeys[i] = result.cloudKey!;
          } else {
            _cloudPhotoUrls.add(result.cloudUrl!);
            _cloudPhotoKeys.add(result.cloudKey!);
          }

          print('☁️ Foto $i uploaded: ${result.cloudKey}');
        }
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              '☁️ ${_cloudPhotoUrls.length} foto(s) sincronizada(s) com S3',
            ),
            backgroundColor: Colors.blue,
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (e) {
      print('❌ Erro ao fazer upload para cloud: $e');
    } finally {
      if (mounted) {
        setState(() => _isUploadingToCloud = false);
      }
    }
  }

  Future<void> _syncTaskToCloud(Task task) async {
    if (!await CloudService.instance.isOnline()) {
      return;
    }

    try {
      await CloudService.instance.syncTask(task.toCloudMap());
      print('☁️ Tarefa sincronizada com DynamoDB: ${task.id}');
    } catch (e) {
      print('❌ Erro ao sincronizar tarefa com cloud: $e');
    }
  }

  Future<void> _saveTask() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isLoading = true);

    try {
      // Upload de fotos para S3 se habilitado
      if (_syncToCloud && _photoPaths.isNotEmpty) {
        await _uploadPhotosToCloud();
      }

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
          photoPath: _photoPath,
          photoPaths: _photoPaths,
          latitude: _latitude,
          longitude: _longitude,
          locationName: _locationName,
          cloudPhotoUrls: _cloudPhotoUrls,
          cloudPhotoKeys: _cloudPhotoKeys,
          syncedToCloud: _syncToCloud && _cloudPhotoUrls.isNotEmpty,
        );
        await DatabaseService.instance.create(newTask);

        // Sincronizar com DynamoDB
        if (_syncToCloud) {
          await _syncTaskToCloud(newTask);
        }

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
          photoPath: _photoPath,
          photoPaths: _photoPaths,
          latitude: _latitude,
          longitude: _longitude,
          locationName: _locationName,
          cloudPhotoUrls: _cloudPhotoUrls,
          cloudPhotoKeys: _cloudPhotoKeys,
          syncedToCloud: _syncToCloud && _cloudPhotoUrls.isNotEmpty,
        );
        await DatabaseService.instance.update(updatedTask);

        // Sincronizar com DynamoDB
        if (_syncToCloud) {
          await _syncTaskToCloud(updatedTask);
        }

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
                      initialValue: _categoryId,
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
                      initialValue: _priority,
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

                    // SEÇÃO FOTOS
                    Row(
                      children: [
                        const Icon(Icons.photo_library, color: Colors.blue),
                        const SizedBox(width: 8),
                        Text(
                          'Fotos${_photoPaths.isNotEmpty ? ' (${_photoPaths.length})' : ''}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Spacer(),
                        if (_photoPaths.isNotEmpty)
                          TextButton.icon(
                            onPressed: _removeAllPhotos,
                            icon: const Icon(Icons.delete_outline, size: 18),
                            label: const Text('Remover Todas'),
                            style: TextButton.styleFrom(
                              foregroundColor: Colors.red,
                            ),
                          ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    if (_photoPaths.isNotEmpty)
                      SizedBox(
                        height: 120,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: _photoPaths.length + 1,
                          itemBuilder: (context, index) {
                            if (index == _photoPaths.length) {
                              // Botão para adicionar mais fotos
                              return Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: InkWell(
                                  onTap: _showPhotoOptions,
                                  child: Container(
                                    width: 120,
                                    decoration: BoxDecoration(
                                      color: Colors.grey[200],
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: Colors.grey[400]!,
                                        width: 2,
                                        style: BorderStyle.solid,
                                      ),
                                    ),
                                    child: Column(
                                      mainAxisAlignment:
                                          MainAxisAlignment.center,
                                      children: [
                                        Icon(
                                          Icons.add_photo_alternate,
                                          size: 40,
                                          color: Colors.grey[600],
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          'Adicionar',
                                          style: TextStyle(
                                            color: Colors.grey[600],
                                            fontSize: 12,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            }

                            final photoPath = _photoPaths[index];
                            return Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: Stack(
                                children: [
                                  GestureDetector(
                                    onTap: () => _viewPhoto(photoPath, index),
                                    child: Container(
                                      width: 120,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(12),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withOpacity(
                                              0.1,
                                            ),
                                            blurRadius: 8,
                                            offset: const Offset(0, 4),
                                          ),
                                        ],
                                      ),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(12),
                                        child: Image.file(
                                          File(photoPath),
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                    ),
                                  ),
                                  Positioned(
                                    top: 4,
                                    right: 4,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: Colors.red,
                                        shape: BoxShape.circle,
                                      ),
                                      child: IconButton(
                                        icon: const Icon(
                                          Icons.close,
                                          color: Colors.white,
                                          size: 16,
                                        ),
                                        padding: EdgeInsets.zero,
                                        constraints: const BoxConstraints(
                                          minWidth: 28,
                                          minHeight: 28,
                                        ),
                                        onPressed: () => _removePhoto(index),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      )
                    else
                      OutlinedButton.icon(
                        onPressed: _showPhotoOptions,
                        icon: const Icon(Icons.add_photo_alternate),
                        label: const Text('Adicionar Fotos'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.all(16),
                        ),
                      ),

                    const Divider(height: 32),

                    // SEÇÃO LOCALIZAÇÃO
                    Row(
                      children: [
                        const Icon(Icons.location_on, color: Colors.blue),
                        const SizedBox(width: 8),
                        const Text(
                          'Localização',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Spacer(),
                        if (_latitude != null)
                          TextButton.icon(
                            onPressed: _removeLocation,
                            icon: const Icon(Icons.delete_outline, size: 18),
                            label: const Text('Remover'),
                            style: TextButton.styleFrom(
                              foregroundColor: Colors.red,
                            ),
                          ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    if (_latitude != null && _longitude != null)
                      Card(
                        child: ListTile(
                          leading: const Icon(
                            Icons.location_on,
                            color: Colors.blue,
                          ),
                          title: Text(_locationName ?? 'Localização salva'),
                          subtitle: Text(
                            LocationService.instance.formatCoordinates(
                              _latitude!,
                              _longitude!,
                            ),
                          ),
                          trailing: IconButton(
                            icon: const Icon(Icons.edit),
                            onPressed: _showLocationPicker,
                          ),
                        ),
                      )
                    else
                      OutlinedButton.icon(
                        onPressed: _showLocationPicker,
                        icon: const Icon(Icons.add_location),
                        label: const Text('Adicionar Localização'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.all(16),
                        ),
                      ),

                    const SizedBox(height: 32),

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

                    const SizedBox(height: 16),

                    // Switch Sync com Cloud
                    Card(
                      color: Colors.blue[50],
                      child: SwitchListTile(
                        title: const Text('☁️ Sincronizar com Cloud'),
                        subtitle: Text(
                          _syncToCloud
                              ? 'Fotos serão enviadas para S3 (LocalStack)'
                              : 'Apenas armazenamento local',
                        ),
                        value: _syncToCloud,
                        onChanged: (value) {
                          setState(() => _syncToCloud = value);
                        },
                        secondary: Icon(
                          _syncToCloud ? Icons.cloud_upload : Icons.cloud_off,
                          color: _syncToCloud ? Colors.blue : Colors.grey,
                        ),
                      ),
                    ),

                    if (_isUploadingToCloud)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Column(
                          children: [
                            CircularProgressIndicator(),
                            SizedBox(height: 8),
                            Text('Enviando fotos para S3...'),
                          ],
                        ),
                      ),

                    const SizedBox(height: 24),

                    // Botão Salvar
                    ElevatedButton.icon(
                      onPressed: _isUploadingToCloud ? null : _saveTask,
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
