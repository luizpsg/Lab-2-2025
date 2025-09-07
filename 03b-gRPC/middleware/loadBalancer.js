const grpc = require("@grpc/grpc-js");

/**
 * Sistema de Load Balancing para gRPC
 *
 * Implementa balanceamento de carga entre múltiplos servidores gRPC
 * com diferentes estratégias de distribuição
 */
class LoadBalancer {
  constructor() {
    this.servers = [];
    this.currentIndex = 0;
    this.healthChecks = new Map();
    this.strategies = {
      ROUND_ROBIN: "round_robin",
      LEAST_CONNECTIONS: "least_connections",
      RANDOM: "random",
      WEIGHTED_ROUND_ROBIN: "weighted_round_robin",
    };
    this.strategy = this.strategies.ROUND_ROBIN;
    this.connectionCounts = new Map();
    this.serverWeights = new Map();
  }

  /**
   * Adiciona servidor ao pool de load balancing
   */
  addServer(address, options = {}) {
    const server = {
      id: `server_${this.servers.length + 1}`,
      address: address,
      weight: options.weight || 1,
      maxConnections: options.maxConnections || 100,
      healthCheckInterval: options.healthCheckInterval || 30000,
      timeout: options.timeout || 5000,
      isHealthy: true,
      lastHealthCheck: Date.now(),
      connections: 0,
    };

    this.servers.push(server);
    this.connectionCounts.set(server.id, 0);
    this.serverWeights.set(server.id, server.weight);

    // Iniciar health check
    this.startHealthCheck(server);

    console.log(`✅ Servidor adicionado ao load balancer: ${address}`);
    return server.id;
  }

  /**
   * Remove servidor do pool
   */
  removeServer(serverId) {
    const index = this.servers.findIndex((s) => s.id === serverId);
    if (index !== -1) {
      this.servers.splice(index, 1);
      this.connectionCounts.delete(serverId);
      this.serverWeights.delete(serverId);
      console.log(`❌ Servidor removido do load balancer: ${serverId}`);
    }
  }

  /**
   * Define estratégia de load balancing
   */
  setStrategy(strategy) {
    if (Object.values(this.strategies).includes(strategy)) {
      this.strategy = strategy;
      console.log(`🔄 Estratégia de load balancing alterada para: ${strategy}`);
    } else {
      throw new Error(`Estratégia inválida: ${strategy}`);
    }
  }

  /**
   * Seleciona servidor baseado na estratégia configurada
   */
  selectServer() {
    const healthyServers = this.servers.filter((server) => server.isHealthy);

    if (healthyServers.length === 0) {
      throw new Error("Nenhum servidor saudável disponível");
    }

    switch (this.strategy) {
      case this.strategies.ROUND_ROBIN:
        return this.roundRobinSelection(healthyServers);

      case this.strategies.LEAST_CONNECTIONS:
        return this.leastConnectionsSelection(healthyServers);

      case this.strategies.RANDOM:
        return this.randomSelection(healthyServers);

      case this.strategies.WEIGHTED_ROUND_ROBIN:
        return this.weightedRoundRobinSelection(healthyServers);

      default:
        return this.roundRobinSelection(healthyServers);
    }
  }

  /**
   * Seleção Round Robin
   */
  roundRobinSelection(servers) {
    const server = servers[this.currentIndex % servers.length];
    this.currentIndex = (this.currentIndex + 1) % servers.length;
    return server;
  }

  /**
   * Seleção por menor número de conexões
   */
  leastConnectionsSelection(servers) {
    return servers.reduce((min, server) => {
      const currentConnections = this.connectionCounts.get(server.id) || 0;
      const minConnections = this.connectionCounts.get(min.id) || 0;
      return currentConnections < minConnections ? server : min;
    });
  }

  /**
   * Seleção aleatória
   */
  randomSelection(servers) {
    const randomIndex = Math.floor(Math.random() * servers.length);
    return servers[randomIndex];
  }

  /**
   * Seleção Round Robin com pesos
   */
  weightedRoundRobinSelection(servers) {
    // Implementação simplificada - em produção seria mais complexa
    const totalWeight = servers.reduce((sum, server) => sum + server.weight, 0);
    let random = Math.random() * totalWeight;

    for (const server of servers) {
      random -= server.weight;
      if (random <= 0) {
        return server;
      }
    }

    return servers[0]; // Fallback
  }

  /**
   * Cria cliente gRPC com load balancing
   */
  createClient(serviceConstructor, options = {}) {
    const servers = this.servers.filter((s) => s.isHealthy);

    if (servers.length === 0) {
      throw new Error("Nenhum servidor disponível");
    }

    // Para simplicidade, vamos usar o primeiro servidor saudável
    // Em produção, você implementaria um proxy ou usaria uma biblioteca como Envoy
    const selectedServer = this.selectServer();

    console.log(`🔄 Conectando ao servidor: ${selectedServer.address}`);

    const credentials = grpc.credentials.createInsecure();
    const client = new serviceConstructor(selectedServer.address, credentials);

    // Incrementar contador de conexões
    this.incrementConnections(selectedServer.id);

    return client;
  }

  /**
   * Incrementa contador de conexões
   */
  incrementConnections(serverId) {
    const current = this.connectionCounts.get(serverId) || 0;
    this.connectionCounts.set(serverId, current + 1);
  }

  /**
   * Decrementa contador de conexões
   */
  decrementConnections(serverId) {
    const current = this.connectionCounts.get(serverId) || 0;
    this.connectionCounts.set(serverId, Math.max(0, current - 1));
  }

  /**
   * Inicia health check para um servidor
   */
  startHealthCheck(server) {
    const checkHealth = async () => {
      try {
        // Simular health check - em produção seria uma chamada real
        const isHealthy = await this.performHealthCheck(server);

        if (server.isHealthy !== isHealthy) {
          server.isHealthy = isHealthy;
          console.log(
            `${isHealthy ? "✅" : "❌"} Servidor ${server.address} - ${
              isHealthy ? "saudável" : "não saudável"
            }`
          );
        }

        server.lastHealthCheck = Date.now();
      } catch (error) {
        console.error(
          `❌ Erro no health check do servidor ${server.address}:`,
          error.message
        );
        server.isHealthy = false;
      }
    };

    // Executar imediatamente
    checkHealth();

    // Agendar próximos checks
    setInterval(checkHealth, server.healthCheckInterval);
  }

  /**
   * Executa health check em um servidor
   */
  async performHealthCheck(server) {
    return new Promise((resolve) => {
      // Simular health check - em produção seria uma chamada gRPC real
      const timeout = setTimeout(() => {
        resolve(false);
      }, server.timeout);

      // Simular resposta do servidor
      setTimeout(() => {
        clearTimeout(timeout);
        // Simular 95% de sucesso
        resolve(Math.random() > 0.05);
      }, 100);
    });
  }

  /**
   * Obtém estatísticas do load balancer
   */
  getStats() {
    return {
      totalServers: this.servers.length,
      healthyServers: this.servers.filter((s) => s.isHealthy).length,
      strategy: this.strategy,
      servers: this.servers.map((server) => ({
        id: server.id,
        address: server.address,
        isHealthy: server.isHealthy,
        connections: this.connectionCounts.get(server.id) || 0,
        weight: server.weight,
        lastHealthCheck: server.lastHealthCheck,
      })),
    };
  }

  /**
   * Obtém servidor por ID
   */
  getServer(serverId) {
    return this.servers.find((s) => s.id === serverId);
  }

  /**
   * Lista todos os servidores
   */
  listServers() {
    return this.servers.map((server) => ({
      id: server.id,
      address: server.address,
      isHealthy: server.isHealthy,
      connections: this.connectionCounts.get(server.id) || 0,
    }));
  }
}

module.exports = LoadBalancer;
