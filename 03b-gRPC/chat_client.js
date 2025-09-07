const grpc = require("@grpc/grpc-js");
const ProtoLoader = require("./utils/protoLoader");
const readline = require("readline");

/**
 * Cliente de Chat em Tempo Real
 *
 * Demonstra o uso do streaming bidirecional para chat em tempo real
 */
class ChatClient {
  constructor(serverAddress = "localhost:50051") {
    this.serverAddress = serverAddress;
    this.protoLoader = new ProtoLoader();
    this.chatClient = null;
    this.authClient = null;
    this.currentToken = null;
    this.currentUser = null;
    this.rl = null;
  }

  async initialize() {
    try {
      // Carregar protobuf
      const authProto = this.protoLoader.loadProto(
        "auth_service.proto",
        "auth"
      );
      const chatProto = this.protoLoader.loadProto(
        "chat_service.proto",
        "chat"
      );

      // Criar clientes
      const credentials = grpc.credentials.createInsecure();

      this.authClient = new authProto.AuthService(
        this.serverAddress,
        credentials
      );
      this.chatClient = new chatProto.ChatService(
        this.serverAddress,
        credentials
      );

      console.log("✅ Cliente de chat inicializado");
    } catch (error) {
      console.error("❌ Erro na inicialização do cliente:", error);
      throw error;
    }
  }

  // Promisificar chamadas gRPC
  promisify(client, method) {
    return (request) => {
      return new Promise((resolve, reject) => {
        client[method](request, (error, response) => {
          if (error) {
            reject(error);
          } else {
            resolve(response);
          }
        });
      });
    };
  }

  async login(identifier, password) {
    try {
      const loginPromise = this.promisify(this.authClient, "Login");
      const response = await loginPromise({
        identifier,
        password,
      });

      if (response.success) {
        this.currentToken = response.token;
        this.currentUser = response.user;
        console.log(`🔑 Logado como: ${response.user.username}`);
        return true;
      } else {
        console.error("❌ Falha no login:", response.message);
        return false;
      }
    } catch (error) {
      console.error("❌ Erro no login:", error.message);
      return false;
    }
  }

  async register(email, username, password, firstName, lastName) {
    try {
      const registerPromise = this.promisify(this.authClient, "Register");
      const response = await registerPromise({
        email,
        username,
        password,
        first_name: firstName,
        last_name: lastName,
      });

      if (response.success) {
        this.currentToken = response.token;
        this.currentUser = response.user;
        console.log(`✅ Usuário criado e logado: ${response.user.username}`);
        return true;
      } else {
        console.error("❌ Falha no registro:", response.message);
        return false;
      }
    } catch (error) {
      console.error("❌ Erro no registro:", error.message);
      return false;
    }
  }

  async listRooms() {
    try {
      const listRoomsPromise = this.promisify(this.chatClient, "ListRooms");
      const response = await listRoomsPromise({
        token: this.currentToken,
      });

      if (response.success) {
        console.log("\n📋 Salas disponíveis:");
        response.rooms.forEach((room) => {
          console.log(
            `  - ${room.name} (${room.id}): ${room.description} [${room.user_count} usuários]`
          );
        });
        return response.rooms;
      } else {
        console.error("❌ Falha ao listar salas:", response.message);
        return [];
      }
    } catch (error) {
      console.error("❌ Erro ao listar salas:", error.message);
      return [];
    }
  }

  async joinRoom(roomId) {
    try {
      const joinRoomPromise = this.promisify(this.chatClient, "JoinRoom");
      const response = await joinRoomPromise({
        token: this.currentToken,
        room_id: roomId,
      });

      if (response.success) {
        console.log(`✅ Entrou na sala: ${roomId}`);
        return true;
      } else {
        console.error("❌ Falha ao entrar na sala:", response.message);
        return false;
      }
    } catch (error) {
      console.error("❌ Erro ao entrar na sala:", error.message);
      return false;
    }
  }

  async getChatHistory(roomId, limit = 20) {
    try {
      const getHistoryPromise = this.promisify(
        this.chatClient,
        "GetChatHistory"
      );
      const response = await getHistoryPromise({
        token: this.currentToken,
        room_id: roomId,
        limit,
      });

      if (response.success) {
        console.log(`\n📜 Histórico da sala ${roomId}:`);
        response.messages.forEach((msg) => {
          const timestamp = new Date(
            parseInt(msg.timestamp) * 1000
          ).toLocaleTimeString();
          console.log(`[${timestamp}] ${msg.username}: ${msg.content}`);
        });
        return response.messages;
      } else {
        console.error("❌ Falha ao obter histórico:", response.message);
        return [];
      }
    } catch (error) {
      console.error("❌ Erro ao obter histórico:", error.message);
      return [];
    }
  }

  startChat(roomId = "general") {
    if (!this.currentToken) {
      console.error("❌ Você precisa fazer login primeiro");
      return;
    }

    console.log(`\n💬 Iniciando chat na sala: ${roomId}`);
    console.log("Digite 'sair' para sair do chat\n");

    // Configurar streaming bidirecional
    const call = this.chatClient.Chat();

    // Configurar metadata com token
    const metadata = new grpc.Metadata();
    metadata.add("authorization", `Bearer ${this.currentToken}`);
    call.metadata = metadata;

    // Event listeners
    call.on("data", (message) => {
      if (message.user_id !== this.currentUser.id) {
        const timestamp = new Date(
          parseInt(message.timestamp) * 1000
        ).toLocaleTimeString();
        console.log(`[${timestamp}] ${message.username}: ${message.content}`);
      }
    });

    call.on("end", () => {
      console.log("🔌 Conexão de chat encerrada");
    });

    call.on("error", (error) => {
      console.error("❌ Erro no chat:", error.message);
    });

    // Configurar interface de linha de comando
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: `[${this.currentUser.username}]> `,
    });

    this.rl.prompt();

    this.rl.on("line", (input) => {
      const message = input.trim();

      if (message === "sair") {
        call.end();
        this.rl.close();
        return;
      }

      if (message) {
        // Enviar mensagem
        call.write({
          room_id: roomId,
          content: message,
          type: "TEXT",
        });
      }

      this.rl.prompt();
    });

    this.rl.on("close", () => {
      console.log("\n👋 Até logo!");
      process.exit(0);
    });
  }

  async demonstrateChat() {
    console.log("🚀 Demonstração do Chat em Tempo Real\n");

    try {
      await this.initialize();

      // Tentar fazer login
      let loggedIn = await this.login("usuario@teste.com", "senha123");

      if (!loggedIn) {
        // Se falhar, tentar registrar
        console.log("Tentando registrar novo usuário...");
        loggedIn = await this.register(
          "usuario@teste.com",
          "usuarioteste",
          "senha123",
          "João",
          "Silva"
        );
      }

      if (!loggedIn) {
        console.error("❌ Não foi possível fazer login ou registrar");
        return;
      }

      // Listar salas
      await this.listRooms();

      // Entrar na sala geral
      await this.joinRoom("general");

      // Mostrar histórico
      await this.getChatHistory("general", 10);

      // Iniciar chat
      this.startChat("general");
    } catch (error) {
      console.error("❌ Erro na demonstração:", error);
    }
  }
}

// Executar demonstração se arquivo for executado diretamente
if (require.main === module) {
  const client = new ChatClient();
  client.demonstrateChat();
}

module.exports = ChatClient;
