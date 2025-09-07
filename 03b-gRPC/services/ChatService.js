const grpc = require("@grpc/grpc-js");
const { v4: uuidv4 } = require("uuid");
const database = require("../database/database");
const AuthInterceptor = require("../middleware/authInterceptor");
const ErrorHandler = require("../middleware/errorHandler");

/**
 * Serviço de Chat em Tempo Real
 *
 * Implementa chat em tempo real usando streaming bidirecional gRPC
 * com suporte a múltiplas salas e diferentes tipos de mensagem
 */
class ChatService {
  constructor() {
    this.authInterceptor = new AuthInterceptor();
    this.errorHandler = new ErrorHandler();
    this.activeConnections = new Map(); // roomId -> Set de call objects
    this.userRooms = new Map(); // userId -> Set de roomIds
    this.rooms = new Map(); // roomId -> room data
    this.messageHistory = new Map(); // roomId -> array de mensagens

    // Inicializar sala padrão
    this.initializeDefaultRooms();
  }

  /**
   * Inicializa salas padrão
   */
  initializeDefaultRooms() {
    const defaultRooms = [
      {
        id: "general",
        name: "Geral",
        description: "Sala de conversas gerais",
        isPrivate: false,
      },
      {
        id: "tech",
        name: "Tecnologia",
        description: "Discussões sobre tecnologia",
        isPrivate: false,
      },
    ];

    defaultRooms.forEach((room) => {
      this.rooms.set(room.id, {
        ...room,
        userCount: 0,
        createdAt: Date.now(),
      });
      this.messageHistory.set(room.id, []);
    });
  }

  /**
   * Streaming bidirecional para chat
   */
  async chat(call) {
    let userId = null;
    let username = null;
    let currentRoom = null;

    try {
      // Validar token do primeiro metadata
      const token = this.extractTokenFromMetadata(call.metadata);
      if (!token) {
        call.emit("error", {
          code: grpc.status.UNAUTHENTICATED,
          message: "Token de autenticação necessário",
        });
        return;
      }

      const user = await this.authInterceptor.validateToken(token);
      userId = user.id;
      username = user.username;

      console.log(`💬 Usuário ${username} conectado ao chat`);

      // Event listeners para mensagens recebidas
      call.on("data", async (message) => {
        try {
          await this.handleIncomingMessage(call, message, userId, username);
        } catch (error) {
          console.error("Erro ao processar mensagem:", error);
          call.emit("error", this.errorHandler.handleError(error));
        }
      });

      call.on("end", () => {
        this.handleUserDisconnect(call, userId, currentRoom);
        console.log(`💬 Usuário ${username} desconectado`);
      });

      call.on("error", (error) => {
        console.error(`Erro na conexão do usuário ${username}:`, error);
        this.handleUserDisconnect(call, userId, currentRoom);
      });

      // Enviar mensagem de boas-vindas
      const welcomeMessage = this.createSystemMessage(
        "general",
        `Usuário ${username} entrou no chat`,
        "USER_JOINED"
      );
      call.write(welcomeMessage);
    } catch (error) {
      console.error("Erro na conexão do chat:", error);
      call.emit("error", this.errorHandler.handleError(error));
    }
  }

  /**
   * Processa mensagem recebida
   */
  async handleIncomingMessage(call, message, userId, username) {
    const { room_id, content, type = "TEXT" } = message;

    // Validar sala
    if (!this.rooms.has(room_id)) {
      const errorMessage = this.createSystemMessage(
        room_id,
        "Sala não encontrada",
        "SYSTEM"
      );
      call.write(errorMessage);
      return;
    }

    // Criar mensagem
    const chatMessage = {
      id: uuidv4(),
      room_id,
      user_id: userId,
      username,
      content,
      type: this.mapMessageType(type),
      timestamp: Math.floor(Date.now() / 1000),
      metadata: {},
    };

    // Salvar no histórico
    this.saveMessage(chatMessage);

    // Broadcast para todos os usuários da sala
    this.broadcastMessage(room_id, chatMessage, call);

    console.log(`💬 Mensagem de ${username} na sala ${room_id}: ${content}`);
  }

  /**
   * Salva mensagem no histórico
   */
  saveMessage(message) {
    const roomId = message.room_id;
    if (!this.messageHistory.has(roomId)) {
      this.messageHistory.set(roomId, []);
    }

    const history = this.messageHistory.get(roomId);
    history.push(message);

    // Manter apenas as últimas 1000 mensagens por sala
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  /**
   * Transmite mensagem para todos os usuários da sala
   */
  broadcastMessage(roomId, message, senderCall) {
    const roomConnections = this.activeConnections.get(roomId) || new Set();

    roomConnections.forEach((call) => {
      if (call !== senderCall) {
        try {
          call.write(message);
        } catch (error) {
          console.error("Erro ao enviar mensagem:", error);
          // Remover conexão problemática
          roomConnections.delete(call);
        }
      }
    });
  }

  /**
   * Cria mensagem do sistema
   */
  createSystemMessage(roomId, content, type = "SYSTEM") {
    return {
      id: uuidv4(),
      room_id: roomId,
      user_id: "system",
      username: "Sistema",
      content,
      type: this.mapMessageType(type),
      timestamp: Math.floor(Date.now() / 1000),
      metadata: {},
    };
  }

  /**
   * Mapeia tipo de mensagem
   */
  mapMessageType(type) {
    const typeMap = {
      TEXT: 0,
      IMAGE: 1,
      FILE: 2,
      SYSTEM: 3,
      TYPING: 4,
      USER_JOINED: 5,
      USER_LEFT: 6,
    };
    return typeMap[type] || 0;
  }

  /**
   * Extrai token do metadata
   */
  extractTokenFromMetadata(metadata) {
    const authHeader = metadata.get("authorization");
    if (!authHeader || authHeader.length === 0) {
      return null;
    }
    const token = authHeader[0];
    return token.startsWith("Bearer ") ? token.substring(7) : token;
  }

  /**
   * Trata desconexão do usuário
   */
  handleUserDisconnect(call, userId, roomId) {
    if (roomId) {
      const roomConnections = this.activeConnections.get(roomId);
      if (roomConnections) {
        roomConnections.delete(call);

        // Enviar notificação de saída
        const leaveMessage = this.createSystemMessage(
          roomId,
          `Usuário saiu do chat`,
          "USER_LEFT"
        );
        this.broadcastMessage(roomId, leaveMessage, call);
      }
    }
  }

  /**
   * Obter histórico de mensagens
   */
  async getChatHistory(call, callback) {
    try {
      const { token, room_id, limit = 50, cursor } = call.request;

      // Validar token
      const user = await this.authInterceptor.validateTokenFromRequest({
        token,
      });

      // Verificar se sala existe
      if (!this.rooms.has(room_id)) {
        return callback(null, {
          success: false,
          message: "Sala não encontrada",
        });
      }

      const messages = this.messageHistory.get(room_id) || [];
      const startIndex = cursor ? parseInt(cursor) : 0;
      const endIndex = Math.min(startIndex + limit, messages.length);
      const paginatedMessages = messages.slice(startIndex, endIndex);

      callback(null, {
        success: true,
        messages: paginatedMessages,
        next_cursor: endIndex < messages.length ? endIndex.toString() : "",
        message: "Histórico obtido com sucesso",
      });
    } catch (error) {
      callback(this.errorHandler.handleError(error), null);
    }
  }

  /**
   * Entrar em uma sala
   */
  async joinRoom(call, callback) {
    try {
      const { token, room_id } = call.request;

      // Validar token
      const user = await this.authInterceptor.validateTokenFromRequest({
        token,
      });

      // Verificar se sala existe
      if (!this.rooms.has(room_id)) {
        return callback(null, {
          success: false,
          message: "Sala não encontrada",
        });
      }

      // Adicionar usuário à sala
      if (!this.userRooms.has(user.id)) {
        this.userRooms.set(user.id, new Set());
      }
      this.userRooms.get(user.id).add(room_id);

      // Incrementar contador de usuários
      const room = this.rooms.get(room_id);
      room.userCount++;

      callback(null, {
        success: true,
        message: "Entrou na sala com sucesso",
        room_id,
      });
    } catch (error) {
      callback(this.errorHandler.handleError(error), null);
    }
  }

  /**
   * Sair de uma sala
   */
  async leaveRoom(call, callback) {
    try {
      const { token, room_id } = call.request;

      // Validar token
      const user = await this.authInterceptor.validateTokenFromRequest({
        token,
      });

      // Remover usuário da sala
      if (this.userRooms.has(user.id)) {
        this.userRooms.get(user.id).delete(room_id);
      }

      // Decrementar contador de usuários
      const room = this.rooms.get(room_id);
      if (room) {
        room.userCount = Math.max(0, room.userCount - 1);
      }

      callback(null, {
        success: true,
        message: "Saiu da sala com sucesso",
      });
    } catch (error) {
      callback(this.errorHandler.handleError(error), null);
    }
  }

  /**
   * Listar salas disponíveis
   */
  async listRooms(call, callback) {
    try {
      const { token } = call.request;

      // Validar token
      await this.authInterceptor.validateTokenFromRequest({ token });

      const rooms = Array.from(this.rooms.values()).map((room) => ({
        id: room.id,
        name: room.name,
        description: room.description,
        user_count: room.userCount,
        created_at: room.createdAt,
        is_private: room.isPrivate,
      }));

      callback(null, {
        success: true,
        rooms,
        message: "Salas listadas com sucesso",
      });
    } catch (error) {
      callback(this.errorHandler.handleError(error), null);
    }
  }
}

module.exports = ChatService;
