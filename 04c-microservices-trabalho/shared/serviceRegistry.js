// shared/serviceRegistry.js
const fs = require("fs");
const path = require("path");
const axios = require("axios");

class ServiceRegistry {
  constructor() {
    this.registryFile = path.join(__dirname, "registry.json");
    this.services = {};
    this.healthCheckInterval = null;
    this.loadRegistry();
  }

  loadRegistry() {
    try {
      if (fs.existsSync(this.registryFile)) {
        const data = fs.readFileSync(this.registryFile, "utf-8");
        this.services = JSON.parse(data);
      }
    } catch (error) {
      console.error("Error loading registry:", error);
      this.services = {};
    }
  }

  saveRegistry() {
    try {
      fs.writeFileSync(
        this.registryFile,
        JSON.stringify(this.services, null, 2)
      );
    } catch (error) {
      console.error("Error saving registry:", error);
    }
  }

  register(serviceName, serviceInfo) {
    const service = {
      name: serviceName,
      host: serviceInfo.host || "localhost",
      port: serviceInfo.port,
      url: `http://${serviceInfo.host || "localhost"}:${serviceInfo.port}`,
      healthEndpoint: serviceInfo.healthEndpoint || "/health",
      status: "healthy",
      lastHealthCheck: new Date().toISOString(),
      registeredAt: new Date().toISOString(),
      metadata: serviceInfo.metadata || {},
    };

    this.services[serviceName] = service;
    this.saveRegistry();

    console.log(`✅ Service registered: ${serviceName} at ${service.url}`);
    return service;
  }

  deregister(serviceName) {
    if (this.services[serviceName]) {
      delete this.services[serviceName];
      this.saveRegistry();
      console.log(`❌ Service deregistered: ${serviceName}`);
      return true;
    }
    return false;
  }

  getService(serviceName) {
    const service = this.services[serviceName];
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }
    if (service.status !== "healthy") {
      throw new Error(`Service unhealthy: ${serviceName}`);
    }
    return service;
  }

  getAllServices() {
    return this.services;
  }

  getHealthyServices() {
    return Object.values(this.services).filter((s) => s.status === "healthy");
  }

  async checkHealth(serviceName) {
    const service = this.services[serviceName];
    if (!service) return false;

    try {
      const response = await axios.get(
        `${service.url}${service.healthEndpoint}`,
        { timeout: 5000 }
      );

      service.status = "healthy";
      service.lastHealthCheck = new Date().toISOString();

      if (response.data) {
        service.metadata = { ...service.metadata, ...response.data };
      }

      return true;
    } catch (error) {
      service.status = "unhealthy";
      service.lastHealthCheck = new Date().toISOString();
      service.error = error.message;
      return false;
    } finally {
      this.saveRegistry();
    }
  }

  async checkAllHealth() {
    const promises = Object.keys(this.services).map((serviceName) =>
      this.checkHealth(serviceName)
    );

    const results = await Promise.all(promises);
    const healthyCount = results.filter((r) => r === true).length;

    console.log(
      `Health check: ${healthyCount}/${results.length} services healthy`
    );
    return {
      healthy: healthyCount,
      total: results.length,
      services: this.services,
    };
  }

  startHealthChecks(intervalMs = 30000) {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    console.log(`Starting health checks every ${intervalMs / 1000}s`);

    this.healthCheckInterval = setInterval(() => {
      this.checkAllHealth();
    }, intervalMs);

    // Initial health check
    this.checkAllHealth();
  }

  stopHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log("Health checks stopped");
    }
  }

  cleanup() {
    this.stopHealthChecks();
    // Don't clear the registry file on cleanup - let services deregister themselves
  }

  // Circuit Breaker functionality
  getCircuitBreaker(serviceName) {
    if (!this.services[serviceName]) {
      return null;
    }

    const service = this.services[serviceName];
    if (!service.circuitBreaker) {
      service.circuitBreaker = {
        failures: 0,
        lastFailure: null,
        state: "closed", // closed, open, half-open
        threshold: 3,
        timeout: 60000, // 1 minute
        halfOpenRequests: 0,
        maxHalfOpenRequests: 3,
      };
    }

    return service.circuitBreaker;
  }

  recordFailure(serviceName) {
    const breaker = this.getCircuitBreaker(serviceName);
    if (!breaker) return;

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= breaker.threshold) {
      breaker.state = "open";
      console.log(`Circuit breaker OPEN for ${serviceName}`);
    }

    this.saveRegistry();
  }

  recordSuccess(serviceName) {
    const breaker = this.getCircuitBreaker(serviceName);
    if (!breaker) return;

    if (breaker.state === "half-open") {
      breaker.halfOpenRequests++;
      if (breaker.halfOpenRequests >= breaker.maxHalfOpenRequests) {
        breaker.state = "closed";
        breaker.failures = 0;
        breaker.halfOpenRequests = 0;
        console.log(`Circuit breaker CLOSED for ${serviceName}`);
      }
    }

    this.saveRegistry();
  }

  canCallService(serviceName) {
    const breaker = this.getCircuitBreaker(serviceName);
    if (!breaker) return false;

    if (breaker.state === "closed") {
      return true;
    }

    if (breaker.state === "open") {
      const timeSinceFailure = Date.now() - breaker.lastFailure;
      if (timeSinceFailure > breaker.timeout) {
        breaker.state = "half-open";
        breaker.halfOpenRequests = 0;
        console.log(`Circuit breaker HALF-OPEN for ${serviceName}`);
        this.saveRegistry();
        return true;
      }
      return false;
    }

    if (breaker.state === "half-open") {
      return breaker.halfOpenRequests < breaker.maxHalfOpenRequests;
    }

    return false;
  }
}

// Singleton instance
let registryInstance = null;

function getRegistry() {
  if (!registryInstance) {
    registryInstance = new ServiceRegistry();
  }
  return registryInstance;
}

module.exports = {
  ServiceRegistry,
  getRegistry,
};
