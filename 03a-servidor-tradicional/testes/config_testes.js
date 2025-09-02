/**
 * ⚙️ Configurações para Testes de Estresse e Segurança
 * 
 * Este arquivo define diferentes perfis de teste para validar
 * a robustez da API em diferentes cenários
 */

const CONFIGURACOES = {
  // 🟢 Teste Leve - Para desenvolvimento
  light: {
    name: 'Teste Leve',
    description: 'Teste básico para desenvolvimento e validação',
    duration: 30000, // 30 segundos
    concurrentUsers: 10,
    requestsPerUser: 20,
    attackIntensity: 'low',
    securityTests: ['basic'],
    rateLimitTests: true,
    performanceTests: true,
    ddosSimulation: false
  },

  // 🟡 Teste Médio - Para staging
  medium: {
    name: 'Teste Médio',
    description: 'Teste intermediário para ambiente de staging',
    duration: 60000, // 1 minuto
    concurrentUsers: 25,
    requestsPerUser: 50,
    attackIntensity: 'medium',
    securityTests: ['basic', 'sql_injection', 'xss'],
    rateLimitTests: true,
    performanceTests: true,
    ddosSimulation: true
  },

  // 🔴 Teste Pesado - Para produção
  heavy: {
    name: 'Teste Pesado',
    description: 'Teste intensivo para validação de produção',
    duration: 120000, // 2 minutos
    concurrentUsers: 50,
    requestsPerUser: 100,
    attackIntensity: 'high',
    securityTests: ['basic', 'sql_injection', 'xss', 'rate_limit_bypass', 'ddos'],
    rateLimitTests: true,
    performanceTests: true,
    ddosSimulation: true
  },

  // 🛡️ Teste de Segurança - Foco em vulnerabilidades
  security: {
    name: 'Teste de Segurança',
    description: 'Foco em vulnerabilidades e ataques',
    duration: 90000, // 1.5 minutos
    concurrentUsers: 15,
    requestsPerUser: 30,
    attackIntensity: 'high',
    securityTests: ['sql_injection', 'xss', 'rate_limit_bypass', 'brute_force'],
    rateLimitTests: true,
    performanceTests: false,
    ddosSimulation: false
  },

  // 📊 Teste de Performance - Foco em carga
  performance: {
    name: 'Teste de Performance',
    description: 'Foco em performance e escalabilidade',
    duration: 180000, // 3 minutos
    concurrentUsers: 100,
    requestsPerUser: 200,
    attackIntensity: 'low',
    securityTests: ['basic'],
    rateLimitTests: true,
    performanceTests: true,
    ddosSimulation: false
  }
};

// 🎯 Configurações de Ataques
const ATTACK_CONFIGS = {
  sql_injection: {
    payloads: [
      "'; DROP TABLE tasks; --",
      "' OR '1'='1",
      "'; INSERT INTO users (email, password) VALUES ('hacker@evil.com', 'password'); --",
      "' UNION SELECT * FROM users --",
      "'; UPDATE users SET role='admin' WHERE email='test@test.com'; --",
      "'; DELETE FROM tasks; --",
      "' OR 1=1--",
      "'; EXEC xp_cmdshell('dir'); --"
    ],
    endpoints: ['/api/auth/login', '/api/auth/register'],
    expectedResponse: 'blocked'
  },

  xss: {
    payloads: [
      '<script>alert("XSS")</script>',
      'javascript:alert("XSS")',
      '<img src="x" onerror="alert(\'XSS\')">',
      '<svg onload="alert(\'XSS\')">',
      '"><script>alert("XSS")</script>',
      '<iframe src="javascript:alert(\'XSS\')"></iframe>',
      '<object data="javascript:alert(\'XSS\')"></object>',
      '<embed src="javascript:alert(\'XSS\')">'
    ],
    endpoints: ['/api/tasks', '/api/users'],
    expectedResponse: 'blocked'
  },

  rate_limit_bypass: {
    techniques: [
      { name: 'IP Rotation', headers: { 'X-Forwarded-For': '192.168.1.1' } },
      { name: 'Real IP', headers: { 'X-Real-IP': '10.0.0.1' } },
      { name: 'CloudFlare IP', headers: { 'CF-Connecting-IP': '172.16.0.1' } },
      { name: 'Client IP', headers: { 'X-Client-IP': '8.8.8.8' } },
      { name: 'Forwarded IP', headers: { 'Forwarded': 'for=203.0.113.1' } }
    ],
    endpoints: ['/api/auth/login', '/api/tasks'],
    expectedResponse: 'rate_limited'
  },

  brute_force: {
    patterns: [
      { type: 'login', attempts: 100, delay: 0 },
      { type: 'password', attempts: 50, delay: 100 },
      { type: 'token', attempts: 200, delay: 0 }
    ],
    endpoints: ['/api/auth/login', '/api/auth/register'],
    expectedResponse: 'rate_limited'
  },

  ddos: {
    patterns: [
      { name: 'Slow Rate', requestsPerSecond: 50, duration: 30 },
      { name: 'Medium Rate', requestsPerSecond: 100, duration: 30 },
      { name: 'High Rate', requestsPerSecond: 200, duration: 30 },
      { name: 'Burst', requestsPerSecond: 500, duration: 10 }
    ],
    endpoints: ['/api/tasks', '/api/users', '/api/tasks/stats/summary'],
    expectedResponse: 'rate_limited'
  }
};

// 📊 Configurações de Monitoramento
const MONITORING_CONFIG = {
  metrics: {
    responseTime: {
      thresholds: {
        warning: 500,  // ms
        critical: 1000 // ms
      }
    },
    errorRate: {
      thresholds: {
        warning: 0.05,  // 5%
        critical: 0.10  // 10%
      }
    },
    rateLimitEffectiveness: {
      thresholds: {
        warning: 0.80,  // 80%
        critical: 0.60  // 60%
      }
    }
  },

  alerts: {
    enabled: true,
    channels: ['console', 'file'],
    realTime: true
  }
};

// 🔧 Configurações de Execução
const EXECUTION_CONFIG = {
  retry: {
    enabled: true,
    maxAttempts: 3,
    delay: 1000
  },

  timeout: {
    request: 10000,    // 10s
    test: 300000,      // 5min
    cleanup: 10000     // 10s
  },

  cleanup: {
    enabled: true,
    removeTestData: true,
    resetRateLimits: false
  }
};

module.exports = {
  CONFIGURACOES,
  ATTACK_CONFIGS,
  MONITORING_CONFIG,
  EXECUTION_CONFIG
};
