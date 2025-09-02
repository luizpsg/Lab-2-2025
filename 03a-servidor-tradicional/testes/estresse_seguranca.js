#!/usr/bin/env node

/**
 * 🧪 Teste de Estresse e Segurança - Task Management API
 * 
 * Este script testa:
 * - Rate limiting por usuário e IP
 * - Capacidade de lidar com carga alta
 * - Vulnerabilidades de segurança
 * - Perda de pacotes sob estresse
 * - Comportamento sob ataques
 * 
 * Uso: node testes/estresse_seguranca.js
 */

const axios = require('axios');
const { performance } = require('perf_hooks');
const fs = require('fs').promises;
const path = require('path');

// Configurações do teste
const CONFIG = {
  baseURL: 'http://localhost:3000',
  testDuration: 60000, // 1 minuto
  concurrentUsers: 50,
  requestsPerUser: 100,
  attackTypes: ['brute_force', 'ddos', 'sql_injection', 'xss', 'rate_limit_bypass'],
  reportFile: 'relatorio_estresse_seguranca.json'
};

// Estatísticas do teste
const stats = {
  startTime: null,
  endTime: null,
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  rateLimitedRequests: 0,
  securityBlockedRequests: 0,
  averageResponseTime: 0,
  responseTimes: [],
  errors: [],
  securityTests: {
    bruteForce: { attempts: 0, blocked: 0, success: 0 },
    ddos: { requests: 0, blocked: 0, success: 0 },
    sqlInjection: { attempts: 0, blocked: 0, success: 0 },
    xss: { attempts: 0, blocked: 0, success: 0 },
    rateLimitBypass: { attempts: 0, blocked: 0, success: 0 }
  },
  performance: {
    minResponseTime: Infinity,
    maxResponseTime: 0,
    p50: 0,
    p90: 0,
    p95: 0,
    p99: 0
  }
};

// Cliente HTTP configurado
const httpClient = axios.create({
  baseURL: CONFIG.baseURL,
  timeout: 10000,
  headers: {
    'User-Agent': 'SecurityTestBot/1.0',
    'Accept': 'application/json'
  }
});

/**
 * 🎯 Teste de Rate Limiting
 */
async function testRateLimiting() {
  console.log('🔒 Testando Rate Limiting...');
  
  const testCases = [
    { name: 'Login Brute Force', endpoint: '/api/auth/login', data: { identifier: 'test@test.com', password: 'wrong' } },
    { name: 'Task Creation Spam', endpoint: '/api/tasks', data: { title: 'Test Task', description: 'Test' } },
    { name: 'API Endpoint Spam', endpoint: '/api/tasks', method: 'GET' }
  ];

  for (const testCase of testCases) {
    console.log(`  📍 ${testCase.name}...`);
    
    const promises = [];
    for (let i = 0; i < 100; i++) {
      const startTime = performance.now();
      
      const promise = httpClient.request({
        method: testCase.method || 'POST',
        url: testCase.endpoint,
        data: testCase.data,
        headers: { 'X-Forwarded-For': `192.168.1.${i % 255}` }
      }).then(response => {
        const responseTime = performance.now() - startTime;
        stats.responseTimes.push(responseTime);
        stats.successfulRequests++;
        return { success: true, responseTime, status: response.status };
      }).catch(error => {
        const responseTime = performance.now() - startTime;
        stats.responseTimes.push(responseTime);
        
        if (error.response?.status === 429) {
          stats.rateLimitedRequests++;
          return { success: false, rateLimited: true, status: 429, responseTime };
        } else if (error.response?.status === 401) {
          stats.securityBlockedRequests++;
          return { success: false, blocked: true, status: 401, responseTime };
        } else {
          stats.failedRequests++;
          return { success: false, error: error.message, responseTime };
        }
      });
      
      promises.push(promise);
    }
    
    const results = await Promise.allSettled(promises);
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const rateLimited = results.filter(r => r.status === 'fulfilled' && r.value.rateLimited).length;
    const blocked = results.filter(r => r.status === 'fulfilled' && r.value.blocked).length;
    
    console.log(`    ✅ Sucessos: ${successful}, 🚫 Rate Limited: ${rateLimited}, 🛡️ Bloqueados: ${blocked}`);
  }
}

/**
 * 🚨 Teste de Ataques de Segurança
 */
async function testSecurityAttacks() {
  console.log('🛡️ Testando Ataques de Segurança...');
  
  // Teste de SQL Injection
  const sqlInjectionPayloads = [
    "'; DROP TABLE tasks; --",
    "' OR '1'='1",
    "'; INSERT INTO users (email, password) VALUES ('hacker@evil.com', 'password'); --",
    "' UNION SELECT * FROM users --",
    "'; UPDATE users SET role='admin' WHERE email='test@test.com'; --"
  ];
  
  console.log('  📍 SQL Injection...');
  for (const payload of sqlInjectionPayloads) {
    try {
      const response = await httpClient.post('/api/auth/login', {
        identifier: payload,
        password: 'test'
      });
      
      if (response.status === 200) {
        stats.securityTests.sqlInjection.success++;
        console.log(`    ⚠️  SQL Injection bem-sucedido com payload: ${payload.substring(0, 30)}...`);
      }
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 401) {
        stats.securityTests.sqlInjection.blocked++;
      }
    }
    stats.securityTests.sqlInjection.attempts++;
  }
  
  // Teste de XSS
  const xssPayloads = [
    '<script>alert("XSS")</script>',
    'javascript:alert("XSS")',
    '<img src="x" onerror="alert(\'XSS\')">',
    '<svg onload="alert(\'XSS\')">',
    '"><script>alert("XSS")</script>'
  ];
  
  console.log('  📍 XSS...');
  for (const payload of xssPayloads) {
    try {
      const response = await httpClient.post('/api/tasks', {
        title: payload,
        description: 'XSS test'
      });
      
      if (response.status === 200) {
        stats.securityTests.xss.success++;
        console.log(`    ⚠️  XSS bem-sucedido com payload: ${payload.substring(0, 30)}...`);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        stats.securityTests.xss.blocked++;
      }
    }
    stats.securityTests.xss.attempts++;
  }
  
  // Teste de Rate Limit Bypass
  console.log('  📍 Rate Limit Bypass...');
  const bypassAttempts = [
    { headers: { 'X-Forwarded-For': '192.168.1.1' } },
    { headers: { 'X-Real-IP': '10.0.0.1' } },
    { headers: { 'CF-Connecting-IP': '172.16.0.1' } },
    { headers: { 'X-Client-IP': '8.8.8.8' } }
  ];
  
  for (const attempt of bypassAttempts) {
    try {
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(httpClient.post('/api/auth/login', {
          identifier: 'test@test.com',
          password: 'wrong'
        }, attempt));
      }
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
      
      if (successful > 10) {
        stats.securityTests.rateLimitBypass.success++;
        console.log(`    ⚠️  Rate Limit Bypass bem-sucedido com headers: ${JSON.stringify(attempt.headers)}`);
      }
    } catch (error) {
      // Rate limit funcionando
    }
    stats.securityTests.rateLimitBypass.attempts++;
  }
}

/**
 * 📊 Teste de Performance sob Carga
 */
async function testPerformanceUnderLoad() {
  console.log('📊 Testando Performance sob Carga...');
  
  const startTime = performance.now();
  const promises = [];
  
  // Simular múltiplos usuários fazendo requisições simultâneas
  for (let user = 0; user < CONFIG.concurrentUsers; user++) {
    for (let request = 0; request < CONFIG.requestsPerUser; request++) {
      const promise = (async () => {
        const requestStart = performance.now();
        
        try {
          const response = await httpClient.get('/api/tasks', {
            headers: { 'X-User-ID': `user-${user}` }
          });
          
          const responseTime = performance.now() - requestStart;
          stats.responseTimes.push(responseTime);
          stats.successfulRequests++;
          
          return { success: true, responseTime, status: response.status };
        } catch (error) {
          const responseTime = performance.now() - requestStart;
          stats.responseTimes.push(responseTime);
          
          if (error.response?.status === 429) {
            stats.rateLimitedRequests++;
            return { success: false, rateLimited: true, status: 429, responseTime };
          } else {
            stats.failedRequests++;
            return { success: false, error: error.message, responseTime, status: error.response?.status };
          }
        }
      })();
      
      promises.push(promise);
    }
  }
  
  console.log(`  📍 Executando ${promises.length} requisições simultâneas...`);
  const results = await Promise.allSettled(promises);
  
  const endTime = performance.now();
  stats.totalRequests = promises.length;
  
  // Calcular estatísticas de performance
  const successfulResponses = results
    .filter(r => r.status === 'fulfilled' && r.value.success)
    .map(r => r.value.responseTime);
  
  if (successfulResponses.length > 0) {
    stats.performance.minResponseTime = Math.min(...successfulResponses);
    stats.performance.maxResponseTime = Math.max(...successfulResponses);
    
    const sorted = successfulResponses.sort((a, b) => a - b);
    stats.performance.p50 = sorted[Math.floor(sorted.length * 0.5)];
    stats.performance.p90 = sorted[Math.floor(sorted.length * 0.9)];
    stats.performance.p95 = sorted[Math.floor(sorted.length * 0.95)];
    stats.performance.p99 = sorted[Math.floor(sorted.length * 0.99)];
    
    stats.averageResponseTime = successfulResponses.reduce((a, b) => a + b, 0) / successfulResponses.length;
  }
  
  console.log(`  ⏱️  Tempo total: ${((endTime - startTime) / 1000).toFixed(2)}s`);
  console.log(`  📈 Requisições/s: ${(stats.totalRequests / ((endTime - startTime) / 1000)).toFixed(2)}`);
}

/**
 * 🔍 Teste de DDoS Simulado
 */
async function testDDoSSimulation() {
  console.log('🌊 Testando Simulação de DDoS...');
  
  const attackDuration = 30000; // 30 segundos
  const requestsPerSecond = 100;
  const totalRequests = (attackDuration / 1000) * requestsPerSecond;
  
  console.log(`  📍 Simulando ${totalRequests} requisições em ${attackDuration/1000}s (${requestsPerSecond} req/s)`);
  
  const startTime = performance.now();
  const promises = [];
  
  for (let i = 0; i < totalRequests; i++) {
    const promise = (async () => {
      const requestStart = performance.now();
      
      try {
        const response = await httpClient.get('/api/tasks', {
          headers: { 
            'X-Forwarded-For': `10.0.0.${i % 255}`,
            'User-Agent': `DDoSBot/${i}`
          }
        });
        
        const responseTime = performance.now() - requestStart;
        stats.responseTimes.push(responseTime);
        stats.successfulRequests++;
        stats.securityTests.ddos.success++;
        
        return { success: true, responseTime, status: response.status };
      } catch (error) {
        const responseTime = performance.now() - requestStart;
        stats.responseTimes.push(responseTime);
        
        if (error.response?.status === 429) {
          stats.rateLimitedRequests++;
          stats.securityTests.ddos.blocked++;
          return { success: false, rateLimited: true, status: 429, responseTime };
        } else {
          stats.failedRequests++;
          return { success: false, error: error.message, responseTime };
        }
      }
    })();
    
    promises.push(promise);
    
    // Controlar taxa de requisições
    if (i % requestsPerSecond === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const results = await Promise.allSettled(promises);
  const endTime = performance.now();
  
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const rateLimited = results.filter(r => r.status === 'fulfilled' && r.value.rateLimited).length;
  const failed = results.filter(r => r.status === 'rejected').length;
  
  console.log(`  📊 Resultados DDoS:`);
  console.log(`    ✅ Sucessos: ${successful}`);
  console.log(`    🚫 Rate Limited: ${rateLimited}`);
  console.log(`    ❌ Falhas: ${failed}`);
  console.log(`    ⏱️  Tempo: ${((endTime - startTime) / 1000).toFixed(2)}s`);
}

/**
 * 📝 Gerar Relatório
 */
async function generateReport() {
  console.log('📝 Gerando Relatório...');
  
  const report = {
    timestamp: new Date().toISOString(),
    testConfiguration: CONFIG,
    summary: {
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      rateLimitedRequests: stats.rateLimitedRequests,
      securityBlockedRequests: stats.securityBlockedRequests,
      successRate: ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) + '%',
      failureRate: ((stats.failedRequests / stats.totalRequests) * 100).toFixed(2) + '%',
      rateLimitEffectiveness: ((stats.rateLimitedRequests / (stats.rateLimitedRequests + stats.successfulRequests)) * 100).toFixed(2) + '%'
    },
    performance: {
      averageResponseTime: stats.averageResponseTime.toFixed(2) + 'ms',
      minResponseTime: stats.performance.minResponseTime.toFixed(2) + 'ms',
      maxResponseTime: stats.performance.maxResponseTime.toFixed(2) + 'ms',
      p50: stats.performance.p50.toFixed(2) + 'ms',
      p90: stats.performance.p90.toFixed(2) + 'ms',
      p95: stats.performance.p95.toFixed(2) + 'ms',
      p99: stats.performance.p99.toFixed(2) + 'ms'
    },
    securityTests: stats.securityTests,
    recommendations: generateRecommendations(),
    rawStats: stats
  };
  
  try {
    await fs.writeFile(CONFIG.reportFile, JSON.stringify(report, null, 2));
    console.log(`  ✅ Relatório salvo em: ${CONFIG.reportFile}`);
  } catch (error) {
    console.error(`  ❌ Erro ao salvar relatório: ${error.message}`);
  }
  
  return report;
}

/**
 * 💡 Gerar Recomendações
 */
function generateRecommendations() {
  const recommendations = [];
  
  // Análise de Rate Limiting
  const rateLimitEffectiveness = (stats.rateLimitedRequests / (stats.rateLimitedRequests + stats.successfulRequests)) * 100;
  if (rateLimitEffectiveness < 80) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Rate Limiting',
      issue: 'Eficácia do rate limiting abaixo de 80%',
      recommendation: 'Revisar configurações de rate limiting e implementar proteções adicionais'
    });
  }
  
  // Análise de Segurança
  if (stats.securityTests.sqlInjection.success > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Segurança',
      issue: 'SQL Injection bem-sucedido',
      recommendation: 'Implementar validação rigorosa de entrada e prepared statements'
    });
  }
  
  if (stats.securityTests.xss.success > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Segurança',
      issue: 'XSS bem-sucedido',
      recommendation: 'Implementar sanitização de entrada e CSP headers'
    });
  }
  
  if (stats.securityTests.rateLimitBypass.success > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Rate Limiting',
      issue: 'Bypass de rate limiting detectado',
      recommendation: 'Implementar rate limiting baseado em múltiplos identificadores'
    });
  }
  
  // Análise de Performance
  if (stats.averageResponseTime > 1000) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Performance',
      issue: 'Latência média alta (>1s)',
      recommendation: 'Otimizar consultas de banco e implementar cache'
    });
  }
  
  if (stats.failedRequests > stats.totalRequests * 0.1) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Estabilidade',
      issue: 'Taxa de falha alta (>10%)',
      recommendation: 'Investigar causas de falha e implementar retry logic'
    });
  }
  
  return recommendations;
}

/**
 * 🎯 Função Principal
 */
async function runSecurityStressTest() {
  console.log('🚀 Iniciando Teste de Estresse e Segurança...');
  console.log(`📍 API: ${CONFIG.baseURL}`);
  console.log(`⏱️  Duração: ${CONFIG.testDuration / 1000}s`);
  console.log(`👥 Usuários simultâneos: ${CONFIG.concurrentUsers}`);
  console.log(`📨 Requisições por usuário: ${CONFIG.requestsPerUser}`);
  console.log('');
  
  stats.startTime = performance.now();
  
  try {
    // Teste de Rate Limiting
    await testRateLimiting();
    console.log('');
    
    // Teste de Segurança
    await testSecurityAttacks();
    console.log('');
    
    // Teste de Performance
    await testPerformanceUnderLoad();
    console.log('');
    
    // Teste de DDoS
    await testDDoSSimulation();
    console.log('');
    
    // Gerar Relatório
    const report = await generateReport();
    
    // Exibir Resumo
    console.log('📊 RESUMO DO TESTE');
    console.log('==================');
    console.log(`📈 Total de Requisições: ${report.summary.totalRequests}`);
    console.log(`✅ Sucessos: ${report.summary.successfulRequests} (${report.summary.successRate})`);
    console.log(`❌ Falhas: ${report.summary.failedRequests} (${report.summary.failureRate})`);
    console.log(`🚫 Rate Limited: ${report.summary.rateLimitedRequests}`);
    console.log(`🛡️  Bloqueados por Segurança: ${report.summary.securityBlockedRequests}`);
    console.log(`⏱️  Latência Média: ${report.performance.averageResponseTime}`);
    console.log(`🎯 Eficácia Rate Limiting: ${report.summary.rateLimitEffectiveness}`);
    console.log('');
    
    if (report.recommendations.length > 0) {
      console.log('💡 RECOMENDAÇÕES');
      console.log('=================');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.category}: ${rec.issue}`);
        console.log(`   💡 ${rec.recommendation}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    stats.errors.push(error.message);
  } finally {
    stats.endTime = performance.now();
    const totalTime = (stats.endTime - stats.startTime) / 1000;
    console.log(`⏱️  Teste concluído em ${totalTime.toFixed(2)}s`);
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  runSecurityStressTest().catch(console.error);
}

module.exports = {
  runSecurityStressTest,
  CONFIG,
  stats
};
