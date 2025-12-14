import 'dart:convert';
import 'package:uuid/uuid.dart';

class Task {
  final String id;
  final String title;
  final String description;
  final bool completed;
  final String priority;
  final DateTime createdAt;
  final DateTime? dueDate;
  final String categoryId;
  final DateTime? reminderTime;

  // CÂMERA
  final String? photoPath; // Mantido para compatibilidade
  final List<String> photoPaths; // Nova lista de fotos

  // SENSORES
  final DateTime? completedAt;
  final String? completedBy; // 'manual', 'shake'

  // GPS
  final double? latitude;
  final double? longitude;
  final String? locationName;

  // CLOUD (LocalStack S3)
  final List<String> cloudPhotoUrls; // URLs das fotos no S3
  final List<String> cloudPhotoKeys; // Keys das fotos no S3
  final bool syncedToCloud; // Se a tarefa foi sincronizada com DynamoDB

  Task({
    String? id,
    required this.title,
    this.description = '',
    this.completed = false,
    this.priority = 'medium',
    DateTime? createdAt,
    this.dueDate,
    this.categoryId = 'other',
    this.reminderTime,
    this.photoPath,
    List<String>? photoPaths,
    this.completedAt,
    this.completedBy,
    this.latitude,
    this.longitude,
    this.locationName,
    List<String>? cloudPhotoUrls,
    List<String>? cloudPhotoKeys,
    this.syncedToCloud = false,
  }) : id = id ?? const Uuid().v4(),
       createdAt = createdAt ?? DateTime.now(),
       photoPaths = photoPaths ?? (photoPath != null ? [photoPath] : []),
       cloudPhotoUrls = cloudPhotoUrls ?? [],
       cloudPhotoKeys = cloudPhotoKeys ?? [];

  // Getters auxiliares
  bool get hasPhoto => photoPaths.isNotEmpty;
  bool get hasLocation => latitude != null && longitude != null;
  bool get wasCompletedByShake => completedBy == 'shake';
  int get photoCount => photoPaths.length;
  bool get hasCloudPhotos => cloudPhotoUrls.isNotEmpty;
  int get cloudPhotoCount => cloudPhotoUrls.length;

  bool get isOverdue {
    if (dueDate == null || completed) return false;
    return DateTime.now().isAfter(dueDate!);
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'completed': completed ? 1 : 0,
      'priority': priority,
      'createdAt': createdAt.toIso8601String(),
      'dueDate': dueDate?.toIso8601String(),
      'categoryId': categoryId,
      'reminderTime': reminderTime?.toIso8601String(),
      'photoPath': photoPath,
      'photoPaths': jsonEncode(photoPaths),
      'completedAt': completedAt?.toIso8601String(),
      'completedBy': completedBy,
      'latitude': latitude,
      'longitude': longitude,
      'locationName': locationName,
      'cloudPhotoUrls': jsonEncode(cloudPhotoUrls),
      'cloudPhotoKeys': jsonEncode(cloudPhotoKeys),
      'syncedToCloud': syncedToCloud ? 1 : 0,
    };
  }

  /// Converte para Map compatível com DynamoDB/API
  Map<String, dynamic> toCloudMap() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'completed': completed,
      'priority': priority,
      'createdAt': createdAt.toIso8601String(),
      'dueDate': dueDate?.toIso8601String(),
      'categoryId': categoryId,
      'reminderTime': reminderTime?.toIso8601String(),
      'photoPaths': photoPaths,
      'cloudPhotoUrls': cloudPhotoUrls,
      'cloudPhotoKeys': cloudPhotoKeys,
      'latitude': latitude,
      'longitude': longitude,
      'locationName': locationName,
      'completedAt': completedAt?.toIso8601String(),
      'completedBy': completedBy,
    };
  }

  factory Task.fromMap(Map<String, dynamic> map) {
    // Processa photoPaths: tenta ler da nova coluna, senão usa photoPath antigo
    List<String> photoPaths = [];
    if (map['photoPaths'] != null && map['photoPaths'] is String) {
      try {
        final decoded = jsonDecode(map['photoPaths']);
        photoPaths = List<String>.from(decoded);
      } catch (e) {
        // Se falhar, tenta usar photoPath antigo
        if (map['photoPath'] != null &&
            (map['photoPath'] as String).isNotEmpty) {
          photoPaths = [map['photoPath'] as String];
        }
      }
    } else if (map['photoPaths'] != null && map['photoPaths'] is List) {
      photoPaths = List<String>.from(map['photoPaths']);
    } else if (map['photoPath'] != null &&
        (map['photoPath'] as String).isNotEmpty) {
      // Compatibilidade com versão antiga
      photoPaths = [map['photoPath'] as String];
    }

    // Processa cloudPhotoUrls
    List<String> cloudPhotoUrls = [];
    if (map['cloudPhotoUrls'] != null && map['cloudPhotoUrls'] is String) {
      try {
        cloudPhotoUrls = List<String>.from(jsonDecode(map['cloudPhotoUrls']));
      } catch (e) {
        cloudPhotoUrls = [];
      }
    } else if (map['cloudPhotoUrls'] != null && map['cloudPhotoUrls'] is List) {
      cloudPhotoUrls = List<String>.from(map['cloudPhotoUrls']);
    }

    // Processa cloudPhotoKeys
    List<String> cloudPhotoKeys = [];
    if (map['cloudPhotoKeys'] != null && map['cloudPhotoKeys'] is String) {
      try {
        cloudPhotoKeys = List<String>.from(jsonDecode(map['cloudPhotoKeys']));
      } catch (e) {
        cloudPhotoKeys = [];
      }
    } else if (map['cloudPhotoKeys'] != null && map['cloudPhotoKeys'] is List) {
      cloudPhotoKeys = List<String>.from(map['cloudPhotoKeys']);
    }

    return Task(
      id: map['id'],
      title: map['title'],
      description: map['description'] ?? '',
      completed: map['completed'] == 1 || map['completed'] == true,
      priority: map['priority'] ?? 'medium',
      createdAt: DateTime.parse(map['createdAt']),
      dueDate: map['dueDate'] != null ? DateTime.parse(map['dueDate']) : null,
      categoryId: map['categoryId'] ?? 'other',
      reminderTime: map['reminderTime'] != null
          ? DateTime.parse(map['reminderTime'])
          : null,
      photoPath: map['photoPath'] as String?,
      photoPaths: photoPaths,
      completedAt: map['completedAt'] != null
          ? DateTime.parse(map['completedAt'])
          : null,
      completedBy: map['completedBy'] as String?,
      latitude: map['latitude'] as double?,
      longitude: map['longitude'] as double?,
      locationName: map['locationName'] as String?,
      cloudPhotoUrls: cloudPhotoUrls,
      cloudPhotoKeys: cloudPhotoKeys,
      syncedToCloud: map['syncedToCloud'] == 1 || map['syncedToCloud'] == true,
    );
  }

  Task copyWith({
    String? title,
    String? description,
    bool? completed,
    String? priority,
    DateTime? dueDate,
    bool clearDueDate = false,
    String? categoryId,
    DateTime? reminderTime,
    bool clearReminderTime = false,
    String? photoPath,
    List<String>? photoPaths,
    DateTime? completedAt,
    String? completedBy,
    double? latitude,
    double? longitude,
    String? locationName,
    List<String>? cloudPhotoUrls,
    List<String>? cloudPhotoKeys,
    bool? syncedToCloud,
  }) {
    return Task(
      id: id,
      title: title ?? this.title,
      description: description ?? this.description,
      completed: completed ?? this.completed,
      priority: priority ?? this.priority,
      createdAt: createdAt,
      dueDate: clearDueDate ? null : (dueDate ?? this.dueDate),
      categoryId: categoryId ?? this.categoryId,
      reminderTime: clearReminderTime
          ? null
          : (reminderTime ?? this.reminderTime),
      photoPath: photoPath ?? this.photoPath,
      photoPaths: photoPaths ?? this.photoPaths,
      completedAt: completedAt ?? this.completedAt,
      completedBy: completedBy ?? this.completedBy,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      locationName: locationName ?? this.locationName,
      cloudPhotoUrls: cloudPhotoUrls ?? this.cloudPhotoUrls,
      cloudPhotoKeys: cloudPhotoKeys ?? this.cloudPhotoKeys,
      syncedToCloud: syncedToCloud ?? this.syncedToCloud,
    );
  }
}
