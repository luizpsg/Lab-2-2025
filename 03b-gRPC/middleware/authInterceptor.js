const grpc = require("@grpc/grpc-js");
const jwt = require("jsonwebtoken");
const database = require("../database/database");

/**
 * Interceptador de Autenticação JWT para gRPC
 *
 * Implementa validação automática de tokens JWT em todas as chamadas gRPC
 * que requerem autenticação, seguindo as melhores práticas de segurança
 */
class AuthInterceptor {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "seu-secret-aqui";
    this.excludedMethods = new Set(["Register", "Login", "ValidateToken"]);
  }

  /**
   * Cria o interceptador de autenticação
   */
  createAuthInterceptor() {
    return (options, nextCall) => {
      return new grpc.InterceptingCall(nextCall(options), {
        start: (metadata, listener, next) => {
          // Extrair método da chamada
          const method = options.method_definition.path.split("/").pop();

          // Verificar se o método requer autenticação
          if (this.excludedMethods.has(method)) {
            return next(metadata, listener);
          }

          // Extrair token do metadata
          const token = this.extractToken(metadata);

          if (!token) {
            const error = new Error("Token de autenticação não fornecido");
            error.code = grpc.status.UNAUTHENTICATED;
            listener.onError(error);
            return;
          }

          // Validar token
          this.validateToken(token)
            .then((user) => {
              // Adicionar informações do usuário ao metadata
              metadata.add("user_id", user.id);
              metadata.add("user_email", user.email);
              metadata.add("user_username", user.username);

              next(metadata, listener);
            })
            .catch((error) => {
              const grpcError = new Error("Token inválido ou expirado");
              grpcError.code = grpc.status.UNAUTHENTICATED;
              grpcError.details = error.message;
              listener.onError(grpcError);
            });
        },
      });
    };
  }

  /**
   * Extrai token do metadata gRPC
   */
  extractToken(metadata) {
    const authHeader = metadata.get("authorization");
    if (!authHeader || authHeader.length === 0) {
      return null;
    }

    const token = authHeader[0];
    if (token.startsWith("Bearer ")) {
      return token.substring(7);
    }

    return token;
  }

  /**
   * Valida token JWT e retorna dados do usuário
   */
  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret);

      // Buscar dados atualizados do usuário
      const userData = await database.get("SELECT * FROM users WHERE id = ?", [
        decoded.id,
      ]);

      if (!userData) {
        throw new Error("Usuário não encontrado");
      }

      return {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
      };
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Token expirado");
      } else if (error.name === "JsonWebTokenError") {
        throw new Error("Token inválido");
      } else {
        throw new Error("Erro na validação do token");
      }
    }
  }

  /**
   * Middleware para validação manual de token (para uso em serviços)
   */
  async validateTokenFromRequest(request) {
    const token = request.token;

    if (!token) {
      throw new Error("Token não fornecido");
    }

    return await this.validateToken(token);
  }
}

module.exports = AuthInterceptor;
