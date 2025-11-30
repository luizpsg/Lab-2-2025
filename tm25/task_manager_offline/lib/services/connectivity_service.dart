import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Serviço de monitoramento de conectividade de rede
class ConnectivityService {
  static final ConnectivityService instance = ConnectivityService._init();
  
  final Connectivity _connectivity = Connectivity();
  final _connectivityController = StreamController<bool>.broadcast();
  
  bool _isOnline = false;
  StreamSubscription? _subscription;

  ConnectivityService._init();

  /// Stream de status de conectividade
  Stream<bool> get connectivityStream => _connectivityController.stream;

  /// Status atual de conectividade
  bool get isOnline => _isOnline;

  /// Inicializar monitoramento
  Future<void> initialize() async {
    // Verificar estado inicial
    final result = await _connectivity.checkConnectivity();
    _updateStatus(result);

    // Escutar mudanças
    _subscription = _connectivity.onConnectivityChanged.listen(_updateStatus);
    
    print('✅ Serviço de conectividade inicializado');
  }

  void _updateStatus(ConnectivityResult result) {
    final wasOnline = _isOnline;
    _isOnline = result != ConnectivityResult.none;

    if (wasOnline != _isOnline) {
      print(_isOnline ? '🟢 Conectado à internet' : '🔴 Sem conexão à internet');
      _connectivityController.add(_isOnline);
    }
  }

  /// Verificar conectividade manualmente
  Future<bool> checkConnectivity() async {
    final result = await _connectivity.checkConnectivity();
    _updateStatus(result);
    return _isOnline;
  }

  /// Dispose
  void dispose() {
    _subscription?.cancel();
    _connectivityController.close();
  }
}