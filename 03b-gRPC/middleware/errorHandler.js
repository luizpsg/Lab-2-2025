const grpc = require("@grpc/grpc-js");

/**
 * Sistema de Tratamento de Erros gRPC
 * 
 * Implementa tratamento robusto de erros com códigos de status apropriados,
 * logging estruturado e mensagens de erro padronizadas
 */
class ErrorHandler {
  constructor() {
    this.errorTypes = {
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
      AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
      NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
      CONFLICT_ERROR: 'CONFLICT_ERROR',
      INTERNAL_ERROR: 'INTERNAL_ERROR',
      RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
      TIMEOUT_ERROR: 'TIMEOUT_ERROR'
    };
  }

  /**
   * Cria callback de erro padronizado para gRPC
   */
  createErrorCallback(callback, context = {}) {
    return (error, response) => {
      if (error) {
        const grpcError = this.handleError(error, context);
        callback(grpcError, null);
      } else {
        callback(null, response);
      }
    };
  }

  /**
   * Trata erros e converte para formato gRPC apropriado
   */
  handleError(error, context = {}) {
    // Log do erro
    this.logError(error, context);

    // Determinar tipo de erro
    const errorType = this.determineErrorType(error);
    
    // Criar erro gRPC
    const grpcError = new Error(this.getErrorMessage(error, errorType));
    grpcError.code = this.getGrpcStatusCode(errorType);
    grpcError.details = this.getErrorDetails(error, errorType);
    grpcError.metadata = this.createErrorMetadata(error, context);

    return grpcError;
  }

  /**
   * Determina o tipo de erro baseado na instância
   */
  determineErrorType(error) {
    if (error.name === 'ValidationError') {
      return this.errorTypes.VALIDATION_ERROR;
    }
    
    if (error.message.includes('Token') || error.message.includes('autenticação')) {
      return this.errorTypes.AUTHENTICATION_ERROR;
    }
    
    if (error.message.includes('não encontrado') || error.message.includes('not found')) {
      return this.errorTypes.NOT_FOUND_ERROR;
    }
    
    if (error.message.includes('já existe') || error.message.includes('already exists')) {
      return this.errorTypes.CONFLICT_ERROR;
    }
    
    if (error.message.includes('permissão') || error.message.includes('permission')) {
      return this.errorTypes.AUTHORIZATION_ERROR;
    }
    
    if (error.message.includes('rate limit') || error.message.includes('limite')) {
      return this.errorTypes.RATE_LIMIT_ERROR;
    }
    
    if (error.message.includes('timeout') || error.message.includes('tempo limite')) {
      return this.errorTypes.TIMEOUT_ERROR;
    }
    
    return this.errorTypes.INTERNAL_ERROR;
  }

  /**
   * Obtém código de status gRPC apropriado
   */
  getGrpcStatusCode(errorType) {
    const statusMap = {
      [this.errorTypes.VALIDATION_ERROR]: grpc.status.INVALID_ARGUMENT,
      [this.errorTypes.AUTHENTICATION_ERROR]: grpc.status.UNAUTHENTICATED,
      [this.errorTypes.AUTHORIZATION_ERROR]: grpc.status.PERMISSION_DENIED,
      [this.errorTypes.NOT_FOUND_ERROR]: grpc.status.NOT_FOUND,
      [this.errorTypes.CONFLICT_ERROR]: grpc.status.ALREADY_EXISTS,
      [this.errorTypes.RATE_LIMIT_ERROR]: grpc.status.RESOURCE_EXHAUSTED,
      [this.errorTypes.TIMEOUT_ERROR]: grpc.status.DEADLINE_EXCEEDED,
      [this.errorTypes.INTERNAL_ERROR]: grpc.status.INTERNAL
    };
    
    return statusMap[errorType] || grpc.status.INTERNAL;
  }

  /**
   * Obtém mensagem de erro amigável
   */
  getErrorMessage(error, errorType) {
    const messageMap = {
      [this.errorTypes.VALIDATION_ERROR]: 'Dados inválidos fornecidos',
      [this.errorTypes.AUTHENTICATION_ERROR]: 'Falha na autenticação',
      [this.errorTypes.AUTHORIZATION_ERROR]: 'Acesso negado',
      [this.errorTypes.NOT_FOUND_ERROR]: 'Recurso não encontrado',
      [this.errorTypes.CONFLICT_ERROR]: 'Conflito de dados',
      [this.errorTypes.RATE_LIMIT_ERROR]: 'Limite de requisições excedido',
      [this.errorTypes.TIMEOUT_ERROR]: 'Tempo limite excedido',
      [this.errorTypes.INTERNAL_ERROR]: 'Erro interno do servidor'
    };
    
    return messageMap[errorType] || 'Erro interno do servidor';
  }

  /**
   * Obtém detalhes do erro
   */
  getErrorDetails(error, errorType) {
    if (errorType === this.errorTypes.VALIDATION_ERROR && error.details) {
      return error.details;
    }
    
    return error.message || 'Erro desconhecido';
  }

  /**
   * Cria metadata de erro
   */
  createErrorMetadata(error, context) {
    const metadata = new grpc.Metadata();
    
    metadata.add('error-type', this.determineErrorType(error));
    metadata.add('timestamp', new Date().toISOString());
    
    if (context.userId) {
      metadata.add('user-id', context.userId);
    }
    
    if (context.method) {
      metadata.add('method', context.method);
    }
    
    return metadata;
  }

  /**
   * Log estruturado de erros
   */
  logError(error, context = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: error.message,
      stack: error.stack,
      type: this.determineErrorType(error),
      context: {
        userId: context.userId,
        method: context.method,
        requestId: context.requestId
      }
    };
    
    console.error('🚨 Erro gRPC:', JSON.stringify(logData, null, 2));
  }

  /**
   * Cria erro de validação
   */
  createValidationError(message, details = []) {
    const error = new Error(message);
    error.name = 'ValidationError';
    error.details = details;
    return error;
  }

  /**
   * Cria erro de não encontrado
   */
  createNotFoundError(resource, identifier) {
    const error = new Error(`${resource} com identificador '${identifier}' não encontrado`);
    error.name = 'NotFoundError';
    return error;
  }

  /**
   * Cria erro de conflito
   */
  createConflictError(resource, field, value) {
    const error = new Error(`${resource} com ${field} '${value}' já existe`);
    error.name = 'ConflictError';
    return error;
  }

  /**
   * Wrapper para métodos de serviço com tratamento de erro
   */
  wrapServiceMethod(serviceMethod, context = {}) {
    return async (call, callback) => {
      try {
        await serviceMethod(call, callback);
      } catch (error) {
        const grpcError = this.handleError(error, {
          ...context,
          method: serviceMethod.name,
          userId: call.metadata?.get('user_id')?.[0]
        });
        callback(grpcError, null);
      }
    };
  }
}

module.exports = ErrorHandler;
