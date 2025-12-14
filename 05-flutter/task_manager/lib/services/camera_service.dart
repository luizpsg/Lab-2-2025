import 'dart:io';
import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as path;
import '../screens/camera_screen.dart';
import 'cloud_service.dart';

class CameraService {
  static final CameraService instance = CameraService._init();
  CameraService._init();

  List<CameraDescription>? _cameras;
  
  // Controle de upload automático para S3
  bool _autoUploadEnabled = true;
  bool get autoUploadEnabled => _autoUploadEnabled;
  set autoUploadEnabled(bool value) => _autoUploadEnabled = value;

  Future<void> initialize() async {
    try {
      _cameras = await availableCameras();
      print(
        '✅ CameraService: ${_cameras?.length ?? 0} câmera(s) encontrada(s)',
      );
    } catch (e) {
      print('⚠️ Erro ao inicializar câmera: $e');
      _cameras = [];
    }
  }

  bool get hasCameras => _cameras != null && _cameras!.isNotEmpty;

  Future<String?> takePicture(BuildContext context) async {
    if (!hasCameras) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('❌ Nenhuma câmera disponível'),
          backgroundColor: Colors.red,
        ),
      );
      return null;
    }

    final camera = _cameras!.first;
    final controller = CameraController(
      camera,
      ResolutionPreset.high,
      enableAudio: false,
    );

    try {
      await controller.initialize();

      if (!context.mounted) return null;

      final imagePath = await Navigator.push<String>(
        context,
        MaterialPageRoute(
          builder: (context) => CameraScreen(controller: controller),
          fullscreenDialog: true,
        ),
      );

      return imagePath;
    } catch (e) {
      print('❌ Erro ao abrir câmera: $e');

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao abrir câmera: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }

      return null;
    } finally {
      controller.dispose();
    }
  }

  Future<String?> pickFromGallery(BuildContext context) async {
    try {
      final ImagePicker picker = ImagePicker();
      final XFile? image = await picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (image == null) {
        return null; // Usuário cancelou
      }

      final savedPath = await savePicture(image);

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🖼️ Foto selecionada da galeria!'),
            backgroundColor: Colors.green,
            duration: Duration(seconds: 2),
          ),
        );
      }

      return savedPath;
    } catch (e) {
      print('❌ Erro ao selecionar da galeria: $e');

      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Erro ao selecionar foto: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }

      return null;
    }
  }

  Future<String> savePicture(XFile image) async {
    try {
      final appDir = await getApplicationDocumentsDirectory();
      final fileName = 'task_${DateTime.now().millisecondsSinceEpoch}.jpg';
      final savePath = path.join(appDir.path, 'images', fileName);

      final imageDir = Directory(path.join(appDir.path, 'images'));
      if (!await imageDir.exists()) {
        await imageDir.create(recursive: true);
      }

      final savedImage = await File(image.path).copy(savePath);
      print('✅ Foto salva: ${savedImage.path}');
      return savedImage.path;
    } catch (e) {
      print('❌ Erro ao salvar foto: $e');
      rethrow;
    }
  }

  Future<bool> deletePhoto(String photoPath) async {
    try {
      final file = File(photoPath);
      if (await file.exists()) {
        await file.delete();
        return true;
      }
      return false;
    } catch (e) {
      print('❌ Erro ao deletar foto: $e');
      return false;
    }
  }

  /// Faz upload de uma foto para o S3 (LocalStack)
  /// Retorna o resultado do upload contendo a URL da imagem no S3
  Future<PhotoUploadResult> uploadToCloud(String localPath) async {
    try {
      final file = File(localPath);
      if (!await file.exists()) {
        return PhotoUploadResult(
          success: false,
          error: 'Arquivo não encontrado',
          localPath: localPath,
        );
      }

      print('☁️ Fazendo upload para S3: $localPath');
      
      final result = await CloudService.instance.uploadImage(file);
      
      if (result != null && result.success) {
        print('✅ Upload S3 concluído: ${result.key}');
        return PhotoUploadResult(
          success: true,
          localPath: localPath,
          cloudKey: result.key,
          cloudUrl: result.url,
        );
      } else {
        return PhotoUploadResult(
          success: false,
          error: result?.error ?? 'Erro desconhecido',
          localPath: localPath,
        );
      }
    } catch (e) {
      print('❌ Erro ao fazer upload para S3: $e');
      return PhotoUploadResult(
        success: false,
        error: e.toString(),
        localPath: localPath,
      );
    }
  }

  /// Faz upload de múltiplas fotos para o S3
  Future<List<PhotoUploadResult>> uploadMultipleToCloud(List<String> localPaths) async {
    final results = <PhotoUploadResult>[];
    
    for (final path in localPaths) {
      final result = await uploadToCloud(path);
      results.add(result);
    }
    
    return results;
  }

  /// Tira uma foto e automaticamente faz upload para o S3 se autoUpload estiver habilitado
  Future<PhotoCaptureResult?> takePictureWithCloud(BuildContext context) async {
    final localPath = await takePicture(context);
    
    if (localPath == null) return null;
    
    PhotoUploadResult? cloudResult;
    if (_autoUploadEnabled) {
      final isOnline = await CloudService.instance.isOnline();
      if (isOnline) {
        cloudResult = await uploadToCloud(localPath);
      }
    }
    
    return PhotoCaptureResult(
      localPath: localPath,
      cloudResult: cloudResult,
    );
  }
}

/// Resultado do upload de uma foto para o S3
class PhotoUploadResult {
  final bool success;
  final String localPath;
  final String? cloudKey;
  final String? cloudUrl;
  final String? error;

  PhotoUploadResult({
    required this.success,
    required this.localPath,
    this.cloudKey,
    this.cloudUrl,
    this.error,
  });
}

/// Resultado da captura de foto com upload opcional para cloud
class PhotoCaptureResult {
  final String localPath;
  final PhotoUploadResult? cloudResult;
  
  PhotoCaptureResult({
    required this.localPath,
    this.cloudResult,
  });
  
  bool get uploadedToCloud => cloudResult?.success ?? false;
  String? get cloudUrl => cloudResult?.cloudUrl;
}
