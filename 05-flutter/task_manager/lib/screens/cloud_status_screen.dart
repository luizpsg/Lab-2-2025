import 'package:flutter/material.dart';
import '../services/cloud_service.dart';

class CloudStatusScreen extends StatefulWidget {
  const CloudStatusScreen({super.key});

  @override
  State<CloudStatusScreen> createState() => _CloudStatusScreenState();
}

class _CloudStatusScreenState extends State<CloudStatusScreen> {
  bool _isLoading = true;
  bool _isOnline = false;
  Map<String, String> _servicesStatus = {};
  List<CloudImage> _images = [];
  final TextEditingController _urlController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _urlController.text = CloudService.instance.baseUrl;
    _checkStatus();
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _checkStatus() async {
    setState(() => _isLoading = true);

    try {
      _isOnline = await CloudService.instance.isOnline();

      if (_isOnline) {
        _servicesStatus = await CloudService.instance.getServicesStatus();
        _images = await CloudService.instance.listImages();
      }
    } catch (e) {
      print('Erro ao verificar status: $e');
    }

    if (mounted) {
      setState(() => _isLoading = false);
    }
  }

  void _updateUrl() {
    final newUrl = _urlController.text.trim();
    if (newUrl.isNotEmpty) {
      CloudService.instance.setBaseUrl(newUrl);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('URL atualizada: $newUrl'),
          backgroundColor: Colors.green,
        ),
      );
      _checkStatus();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('☁️ Status LocalStack'),
        backgroundColor: const Color.fromARGB(255, 61, 168, 114),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _checkStatus,
            tooltip: 'Atualizar status',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _checkStatus,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Configuração da URL
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '⚙️ Configuração do Backend',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 12),
                            TextField(
                              controller: _urlController,
                              decoration: InputDecoration(
                                labelText: 'URL do Backend',
                                hintText: 'http://10.0.2.2:3000',
                                prefixIcon: const Icon(Icons.link),
                                suffixIcon: IconButton(
                                  icon: const Icon(Icons.check),
                                  onPressed: _updateUrl,
                                ),
                              ),
                              onSubmitted: (_) => _updateUrl(),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Dica: Use 10.0.2.2 para emulador Android, localhost para iOS Simulator',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Status de Conexão
                    Card(
                      color: _isOnline ? Colors.green[50] : Colors.red[50],
                      child: ListTile(
                        leading: Icon(
                          _isOnline ? Icons.cloud_done : Icons.cloud_off,
                          color: _isOnline ? Colors.green : Colors.red,
                          size: 32,
                        ),
                        title: Text(
                          _isOnline ? 'Backend Online' : 'Backend Offline',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: _isOnline
                                ? Colors.green[800]
                                : Colors.red[800],
                          ),
                        ),
                        subtitle: Text(
                          _isOnline
                              ? 'Conectado ao LocalStack'
                              : 'Verifique se o docker-compose está rodando',
                        ),
                      ),
                    ),

                    if (_isOnline) ...[
                      const SizedBox(height: 16),

                      // Status dos Serviços AWS
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                '🔧 Serviços AWS (LocalStack)',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 12),
                              ..._servicesStatus.entries.map((entry) {
                                final isOk = entry.value == 'OK';
                                return ListTile(
                                  dense: true,
                                  leading: Icon(
                                    isOk ? Icons.check_circle : Icons.error,
                                    color: isOk ? Colors.green : Colors.red,
                                  ),
                                  title: Text(entry.key.toUpperCase()),
                                  subtitle: Text(entry.value),
                                );
                              }),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Imagens no S3
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  const Text(
                                    '📷 Imagens no S3',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  const Spacer(),
                                  Chip(
                                    label: Text('${_images.length} imagens'),
                                    backgroundColor: Colors.blue[100],
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              if (_images.isEmpty)
                                const Center(
                                  child: Padding(
                                    padding: EdgeInsets.all(20),
                                    child: Text(
                                      'Nenhuma imagem no bucket S3.\nTire uma foto em uma tarefa para ver aqui!',
                                      textAlign: TextAlign.center,
                                      style: TextStyle(color: Colors.grey),
                                    ),
                                  ),
                                )
                              else
                                SizedBox(
                                  height: 120,
                                  child: ListView.builder(
                                    scrollDirection: Axis.horizontal,
                                    itemCount: _images.length,
                                    itemBuilder: (context, index) {
                                      final image = _images[index];
                                      return Padding(
                                        padding: const EdgeInsets.only(
                                          right: 8,
                                        ),
                                        child: GestureDetector(
                                          onTap: () => _showImageDetails(image),
                                          child: Container(
                                            width: 120,
                                            decoration: BoxDecoration(
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              border: Border.all(
                                                color: Colors.grey[300]!,
                                              ),
                                            ),
                                            child: ClipRRect(
                                              borderRadius:
                                                  BorderRadius.circular(8),
                                              child: Image.network(
                                                image.url,
                                                fit: BoxFit.cover,
                                                errorBuilder: (_, __, ___) =>
                                                    const Center(
                                                      child: Icon(
                                                        Icons.broken_image,
                                                        size: 40,
                                                      ),
                                                    ),
                                              ),
                                            ),
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),

                    // Instruções
                    Card(
                      color: Colors.blue[50],
                      child: const Padding(
                        padding: EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '📘 Como usar',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            SizedBox(height: 12),
                            Text('1. Execute: docker-compose up'),
                            SizedBox(height: 4),
                            Text('2. Aguarde o LocalStack inicializar'),
                            SizedBox(height: 4),
                            Text('3. Verifique o status acima'),
                            SizedBox(height: 4),
                            Text(
                              '4. Tire fotos nas tarefas - elas serão salvas no S3!',
                            ),
                            SizedBox(height: 12),
                            Text(
                              'Comandos úteis:',
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                            SizedBox(height: 4),
                            Text(
                              '• aws --endpoint=http://localhost:4566 s3 ls',
                            ),
                            Text(
                              '• aws --endpoint=http://localhost:4566 dynamodb list-tables',
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }

  void _showImageDetails(CloudImage image) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Detalhes da Imagem'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.network(
                image.url,
                height: 200,
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) =>
                    const Center(child: Icon(Icons.broken_image, size: 60)),
              ),
            ),
            const SizedBox(height: 16),
            Text('Key: ${image.key}', style: const TextStyle(fontSize: 12)),
            if (image.size != null)
              Text('Tamanho: ${(image.size! / 1024).toStringAsFixed(2)} KB'),
            if (image.lastModified != null)
              Text('Modificado: ${image.lastModified}'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Fechar'),
          ),
          TextButton(
            onPressed: () async {
              final deleted = await CloudService.instance.deleteImage(
                image.key,
              );
              if (mounted) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      deleted ? 'Imagem deletada' : 'Erro ao deletar',
                    ),
                    backgroundColor: deleted ? Colors.green : Colors.red,
                  ),
                );
                if (deleted) _checkStatus();
              }
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Deletar'),
          ),
        ],
      ),
    );
  }
}
