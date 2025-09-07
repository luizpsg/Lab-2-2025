const grpc = require("@grpc/grpc-js");
const ProtoLoader = require("./utils/protoLoader");
const LoadBalancer = require("./middleware/loadBalancer");

/**
 * Teste do Sistema de Load Balancing
 *
 * Demonstra como o load balancer distribui requisições entre múltiplos servidores
 */
class LoadBalancerTest {
  constructor() {
    this.protoLoader = new ProtoLoader();
    this.loadBalancer = new LoadBalancer();
    this.authClient = null;
    this.taskClient = null;
  }

  async initialize() {
    try {
      // Carregar protobuf
      const authProto = this.protoLoader.loadProto(
        "auth_service.proto",
        "auth"
      );
      const taskProto = this.protoLoader.loadProto(
        "task_service.proto",
        "tasks"
      );

      // Configurar load balancer com múltiplos servidores
      this.loadBalancer.addServer("localhost:50051", {
        weight: 1,
        maxConnections: 10,
      });
      this.loadBalancer.addServer("localhost:50052", {
        weight: 2,
        maxConnections: 20,
      });
      this.loadBalancer.addServer("localhost:50053", {
        weight: 1,
        maxConnections: 15,
      });

      // Configurar estratégia
      this.loadBalancer.setStrategy("round_robin");

      console.log("✅ Load balancer configurado");
      console.log("📊 Estatísticas:", this.loadBalancer.getStats());
    } catch (error) {
      console.error("❌ Erro na inicialização:", error);
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

  async testRoundRobin() {
    console.log("\n🔄 Testando Round Robin...");

    const authProto = this.protoLoader.loadProto("auth_service.proto", "auth");
    const credentials = grpc.credentials.createInsecure();

    // Simular 10 requisições
    for (let i = 0; i < 10; i++) {
      try {
        const server = this.loadBalancer.selectServer();
        console.log(
          `Requisição ${i + 1}: Servidor selecionado - ${server.address}`
        );

        // Simular delay
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Erro na requisição ${i + 1}:`, error.message);
      }
    }
  }

  async testLeastConnections() {
    console.log("\n⚖️ Testando Least Connections...");

    this.loadBalancer.setStrategy("least_connections");

    // Simular diferentes números de conexões
    const servers = this.loadBalancer.listServers();
    servers.forEach((server, index) => {
      for (let i = 0; i < index * 3; i++) {
        this.loadBalancer.incrementConnections(server.id);
      }
    });

    console.log("Conexões atuais:", this.loadBalancer.getStats());

    // Testar seleção
    for (let i = 0; i < 5; i++) {
      try {
        const server = this.loadBalancer.selectServer();
        console.log(
          `Requisição ${i + 1}: Servidor selecionado - ${
            server.address
          } (${this.loadBalancer.connectionCounts.get(server.id)} conexões)`
        );

        // Simular nova conexão
        this.loadBalancer.incrementConnections(server.id);
      } catch (error) {
        console.error(`Erro na requisição ${i + 1}:`, error.message);
      }
    }
  }

  async testRandom() {
    console.log("\n🎲 Testando Random...");

    this.loadBalancer.setStrategy("random");

    const serverCounts = new Map();
    const servers = this.loadBalancer.listServers();

    // Inicializar contadores
    servers.forEach((server) => {
      serverCounts.set(server.address, 0);
    });

    // Simular 100 requisições
    for (let i = 0; i < 100; i++) {
      try {
        const server = this.loadBalancer.selectServer();
        serverCounts.set(server.address, serverCounts.get(server.address) + 1);
      } catch (error) {
        console.error(`Erro na requisição ${i + 1}:`, error.message);
      }
    }

    console.log("Distribuição das requisições:");
    serverCounts.forEach((count, address) => {
      console.log(`  ${address}: ${count} requisições`);
    });
  }

  async testWeightedRoundRobin() {
    console.log("\n⚖️ Testando Weighted Round Robin...");

    this.loadBalancer.setStrategy("weighted_round_robin");

    const serverCounts = new Map();
    const servers = this.loadBalancer.listServers();

    // Inicializar contadores
    servers.forEach((server) => {
      serverCounts.set(server.address, 0);
    });

    // Simular 100 requisições
    for (let i = 0; i < 100; i++) {
      try {
        const server = this.loadBalancer.selectServer();
        serverCounts.set(server.address, serverCounts.get(server.address) + 1);
      } catch (error) {
        console.error(`Erro na requisição ${i + 1}:`, error.message);
      }
    }

    console.log("Distribuição das requisições (com pesos):");
    serverCounts.forEach((count, address) => {
      const server = servers.find((s) => s.address === address);
      console.log(
        `  ${address}: ${count} requisições (peso: ${server?.weight || 1})`
      );
    });
  }

  async testHealthChecks() {
    console.log("\n🏥 Testando Health Checks...");

    // Simular falha de servidor
    const servers = this.loadBalancer.listServers();
    if (servers.length > 0) {
      const server = servers[0];
      console.log(`Simulando falha do servidor: ${server.address}`);

      // Marcar servidor como não saudável
      const serverObj = this.loadBalancer.getServer(server.id);
      if (serverObj) {
        serverObj.isHealthy = false;
      }
    }

    console.log("Estatísticas após falha:", this.loadBalancer.getStats());

    // Testar seleção com servidor falho
    for (let i = 0; i < 5; i++) {
      try {
        const server = this.loadBalancer.selectServer();
        console.log(
          `Requisição ${i + 1}: Servidor selecionado - ${server.address}`
        );
      } catch (error) {
        console.error(`Erro na requisição ${i + 1}:`, error.message);
      }
    }
  }

  async runAllTests() {
    console.log("🚀 Iniciando testes do Load Balancer\n");

    try {
      await this.initialize();

      await this.testRoundRobin();
      await this.testLeastConnections();
      await this.testRandom();
      await this.testWeightedRoundRobin();
      await this.testHealthChecks();

      console.log("\n✅ Todos os testes concluídos!");
      console.log("📊 Estatísticas finais:", this.loadBalancer.getStats());
    } catch (error) {
      console.error("❌ Erro nos testes:", error);
    }
  }
}

// Executar testes se arquivo for executado diretamente
if (require.main === module) {
  const test = new LoadBalancerTest();
  test.runAllTests();
}

module.exports = LoadBalancerTest;
