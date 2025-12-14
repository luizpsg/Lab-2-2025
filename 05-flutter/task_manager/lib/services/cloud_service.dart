import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

/// Serviço para integração com LocalStack (S3, DynamoDB, SQS, SNS)
/// através do backend Node.js
class CloudService {
  static final CloudService instance = CloudService._init();
  CloudService._init();

  // URL do backend - ajustar conforme o ambiente
  // Para emulador Android: 10.0.2.2:3000
  // Para dispositivo físico: usar IP da máquina
  // Para iOS Simulator: localhost:3000
  String _baseUrl = 'http://10.0.2.2:3000';

  /// Configurar URL base do backend
  void setBaseUrl(String url) {
    _baseUrl = url;
    print('☁️ CloudService: URL configurada para $_baseUrl');
  }

  /// Obter URL base atual
  String get baseUrl => _baseUrl;

  // ================== S3 - UPLOAD DE IMAGENS ==================

  /// Faz upload de uma imagem para o S3 via backend
  /// Retorna a URL pré-assinada da imagem no S3
  Future<CloudUploadResult?> uploadImage(File imageFile) async {
    try {
      print('☁️ Iniciando upload para S3: ${imageFile.path}');

      final uri = Uri.parse('$_baseUrl/api/images/upload');
      final request = http.MultipartRequest('POST', uri);

      // Detectar o tipo de imagem pela extensão
      final extension = imageFile.path.split('.').last.toLowerCase();
      String mimeType = 'image/jpeg';
      if (extension == 'png') {
        mimeType = 'image/png';
      } else if (extension == 'gif') {
        mimeType = 'image/gif';
      } else if (extension == 'webp') {
        mimeType = 'image/webp';
      }

      // Adicionar arquivo com Content-Type explícito
      final multipartFile = await http.MultipartFile.fromPath(
        'image',
        imageFile.path,
        contentType: MediaType.parse(mimeType),
      );
      request.files.add(multipartFile);

      // Enviar requisição
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ Upload S3 concluído: ${data['key']}');

        return CloudUploadResult(
          success: true,
          key: data['key'],
          url: data['url'],
          bucket: data['bucket'],
        );
      } else {
        print('❌ Erro no upload S3: ${response.statusCode} - ${response.body}');
        return CloudUploadResult(
          success: false,
          error: 'Erro ${response.statusCode}: ${response.body}',
        );
      }
    } catch (e) {
      print('❌ Exceção no upload S3: $e');
      return CloudUploadResult(success: false, error: e.toString());
    }
  }

  /// Faz upload de uma imagem em Base64 para o S3
  Future<CloudUploadResult?> uploadImageBase64(
    String base64Image, {
    String? filename,
  }) async {
    try {
      print('☁️ Iniciando upload Base64 para S3');

      final uri = Uri.parse('$_baseUrl/api/images/upload-base64');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'image': base64Image, 'filename': filename}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ Upload Base64 S3 concluído: ${data['key']}');

        return CloudUploadResult(
          success: true,
          key: data['key'],
          url: data['url'],
          bucket: data['bucket'],
        );
      } else {
        print('❌ Erro no upload Base64 S3: ${response.statusCode}');
        return CloudUploadResult(
          success: false,
          error: 'Erro ${response.statusCode}: ${response.body}',
        );
      }
    } catch (e) {
      print('❌ Exceção no upload Base64 S3: $e');
      return CloudUploadResult(success: false, error: e.toString());
    }
  }

  /// Lista todas as imagens no bucket S3
  Future<List<CloudImage>> listImages() async {
    try {
      final uri = Uri.parse('$_baseUrl/api/images');
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> images = data['images'] ?? [];

        return images
            .map(
              (img) => CloudImage(
                key: img['key'],
                url: img['url'],
                size: img['size'],
                lastModified: img['lastModified'] != null
                    ? DateTime.parse(img['lastModified'])
                    : null,
              ),
            )
            .toList();
      }
      return [];
    } catch (e) {
      print('❌ Erro ao listar imagens S3: $e');
      return [];
    }
  }

  /// Deleta uma imagem do S3
  Future<bool> deleteImage(String key) async {
    try {
      final uri = Uri.parse('$_baseUrl/api/images/$key');
      final response = await http.delete(uri);
      return response.statusCode == 200;
    } catch (e) {
      print('❌ Erro ao deletar imagem S3: $e');
      return false;
    }
  }

  // ================== DYNAMODB - TAREFAS ==================

  /// Sincroniza uma tarefa com o DynamoDB
  Future<bool> syncTask(Map<String, dynamic> taskData) async {
    try {
      print('☁️ Sincronizando tarefa com DynamoDB: ${taskData['id']}');

      final uri = Uri.parse('$_baseUrl/api/tasks');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(taskData),
      );

      if (response.statusCode == 201) {
        print('✅ Tarefa sincronizada com DynamoDB');
        return true;
      } else {
        print('❌ Erro ao sincronizar: ${response.statusCode}');
        return false;
      }
    } catch (e) {
      print('❌ Exceção ao sincronizar tarefa: $e');
      return false;
    }
  }

  /// Atualiza uma tarefa no DynamoDB
  Future<bool> updateTask(String taskId, Map<String, dynamic> updates) async {
    try {
      final uri = Uri.parse('$_baseUrl/api/tasks/$taskId');
      final response = await http.put(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(updates),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('❌ Erro ao atualizar tarefa no cloud: $e');
      return false;
    }
  }

  /// Busca todas as tarefas do DynamoDB
  Future<List<Map<String, dynamic>>> fetchTasks() async {
    try {
      final uri = Uri.parse('$_baseUrl/api/tasks');
      final response = await http.get(uri);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final List<dynamic> tasks = data['tasks'] ?? [];
        return tasks.cast<Map<String, dynamic>>();
      }
      return [];
    } catch (e) {
      print('❌ Erro ao buscar tarefas do cloud: $e');
      return [];
    }
  }

  /// Deleta uma tarefa do DynamoDB
  Future<bool> deleteTask(String taskId) async {
    try {
      final uri = Uri.parse('$_baseUrl/api/tasks/$taskId');
      final response = await http.delete(uri);
      return response.statusCode == 200;
    } catch (e) {
      print('❌ Erro ao deletar tarefa do cloud: $e');
      return false;
    }
  }

  // ================== SQS/SNS - MENSAGERIA ==================

  /// Envia uma mensagem para a fila SQS
  Future<bool> sendToQueue(String type, Map<String, dynamic> data) async {
    try {
      final uri = Uri.parse('$_baseUrl/api/queue/send');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'type': type, 'data': data}),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('❌ Erro ao enviar para SQS: $e');
      return false;
    }
  }

  /// Publica uma notificação no SNS
  Future<bool> publishNotification(
    String type,
    Map<String, dynamic> data,
  ) async {
    try {
      final uri = Uri.parse('$_baseUrl/api/notifications/publish');
      final response = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'type': type, 'data': data}),
      );

      return response.statusCode == 200;
    } catch (e) {
      print('❌ Erro ao publicar no SNS: $e');
      return false;
    }
  }

  // ================== STATUS/HEALTH ==================

  /// Verifica se o backend está online
  Future<bool> isOnline() async {
    try {
      final uri = Uri.parse('$_baseUrl/health');
      final response = await http.get(uri).timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  /// Verifica status de todos os serviços AWS
  Future<Map<String, String>> getServicesStatus() async {
    try {
      final uri = Uri.parse('$_baseUrl/api/status');
      final response = await http.get(uri).timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Map<String, String>.from(data);
      }
      return {'error': 'Falha ao obter status'};
    } catch (e) {
      return {'error': e.toString()};
    }
  }
}

/// Resultado de um upload para o S3
class CloudUploadResult {
  final bool success;
  final String? key;
  final String? url;
  final String? bucket;
  final String? error;

  CloudUploadResult({
    required this.success,
    this.key,
    this.url,
    this.bucket,
    this.error,
  });
}

/// Representação de uma imagem no S3
class CloudImage {
  final String key;
  final String url;
  final int? size;
  final DateTime? lastModified;

  CloudImage({
    required this.key,
    required this.url,
    this.size,
    this.lastModified,
  });
}
