# 🧪 Testes de Estresse e Segurança - Task Management API

Este diretório contém testes abrangentes para validar a robustez, segurança e performance da API sob diferentes cenários de carga e ataques.

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Instalação](#instalação)
- [Uso](#uso)
- [Perfis de Teste](#perfis-de-teste)
- [Tipos de Teste](#tipos-de-teste)
- [Relatórios](#relatórios)
- [Configuração](#configuração)
- [Troubleshooting](#troubleshooting)

## 🌟 Visão Geral

Os testes de estresse e segurança são projetados para:

- **🔒 Validar Rate Limiting**: Verificar se as proteções contra abuso estão funcionando
- **🛡️ Testar Segurança**: Identificar vulnerabilidades (SQL Injection, XSS, etc.)
- **📊 Medir Performance**: Avaliar comportamento sob carga alta
- **🌊 Simular Ataques**: Testar resiliência contra DDoS e ataques maliciosos
- **📈 Gerar Métricas**: Fornecer dados quantitativos sobre a robustez do sistema

## ✨ Funcionalidades

### **🔒 Testes de Rate Limiting**
- **Brute Force**: Tentativas massivas de login
- **API Spam**: Requisições excessivas para endpoints
- **Bypass Detection**: Identificação de tentativas de contornar limites
- **IP Rotation**: Teste com diferentes headers de IP

### **🛡️ Testes de Segurança**
- **SQL Injection**: Payloads maliciosos para banco de dados
- **XSS (Cross-Site Scripting)**: Scripts maliciosos em campos de entrada
- **Rate Limit Bypass**: Tentativas de contornar proteções
- **Authentication Attacks**: Ataques contra sistema de autenticação

### **📊 Testes de Performance**
- **Load Testing**: Múltiplos usuários simultâneos
- **Stress Testing**: Carga além dos limites normais
- **Concurrency Testing**: Requisições simultâneas
- **Response Time Analysis**: Métricas de latência

### **🌊 Simulação de Ataques**
- **DDoS Simulation**: Ataques distribuídos de negação de serviço
- **Traffic Spikes**: Picos súbitos de tráfego
- **Resource Exhaustion**: Consumo excessivo de recursos
- **Connection Flooding**: Sobrecarga de conexões

## 🚀 Instalação

### **1. Instalar Dependências**
```bash
cd testes
npm install
```

### **2. Verificar Configuração**
```bash
# Verificar se a API está rodando
curl http://localhost:3000/health

# Verificar configurações disponíveis
node run_tests.js --help
```

### **3. Configurar Ambiente**
```bash
# Editar configurações se necessário
nano config_testes.js

# Verificar perfil específico
node run_tests.js light --config
```

## 🎯 Uso

### **Comandos Básicos**
```bash
# Teste padrão (médio)
node run_tests.js

# Teste específico
node run_tests.js light
node run_tests.js heavy
node run_tests.js security
node run_tests.js performance

# Ajuda
node run_tests.js --help

# Ver configuração
node run_tests.js heavy --config
```

### **Execução Direta**
```bash
# Executar teste específico
node estresse_seguranca.js

# Executar com configuração personalizada
node -e "
const { runSecurityStressTest } = require('./estresse_seguranca');
runSecurityStressTest();
"
```

## 📊 Perfis de Teste

### **🟢 Light (Leve)**
- **Duração**: 30 segundos
- **Usuários**: 10 simultâneos
- **Requisições**: 20 por usuário
- **Uso**: Desenvolvimento, validação rápida
- **Impacto**: Baixo

### **🟡 Medium (Médio)**
- **Duração**: 1 minuto
- **Usuários**: 25 simultâneos
- **Requisições**: 50 por usuário
- **Uso**: Staging, testes intermediários
- **Impacto**: Médio

### **🔴 Heavy (Pesado)**
- **Duração**: 2 minutos
- **Usuários**: 50 simultâneos
- **Requisições**: 100 por usuário
- **Uso**: Produção, validação completa
- **Impacto**: Alto

### **🛡️ Security (Segurança)**
- **Duração**: 1.5 minutos
- **Usuários**: 15 simultâneos
- **Requisições**: 30 por usuário
- **Foco**: Vulnerabilidades e ataques
- **Impacto**: Médio

### **📊 Performance (Performance)**
- **Duração**: 3 minutos
- **Usuários**: 100 simultâneos
- **Requisições**: 200 por usuário
- **Foco**: Escalabilidade e performance
- **Impacto**: Alto

## 🔍 Tipos de Teste

### **1. Rate Limiting Tests**
```javascript
// Teste de brute force
const testCases = [
  { name: 'Login Brute Force', endpoint: '/api/auth/login' },
  { name: 'Task Creation Spam', endpoint: '/api/tasks' },
  { name: 'API Endpoint Spam', endpoint: '/api/tasks' }
];
```

### **2. Security Tests**
```javascript
// SQL Injection payloads
const sqlInjectionPayloads = [
  "'; DROP TABLE tasks; --",
  "' OR '1'='1",
  "'; INSERT INTO users (...) VALUES (...); --"
];

// XSS payloads
const xssPayloads = [
  '<script>alert("XSS")</script>',
  'javascript:alert("XSS")',
  '<img src="x" onerror="alert(\'XSS\')">'
];
```

### **3. Performance Tests**
```javascript
// Simular múltiplos usuários
for (let user = 0; user < concurrentUsers; user++) {
  for (let request = 0; request < requestsPerUser; request++) {
    // Executar requisições simultâneas
  }
}
```

### **4. DDoS Simulation**
```javascript
// Padrões de ataque
const ddosPatterns = [
  { name: 'Slow Rate', requestsPerSecond: 50, duration: 30 },
  { name: 'Medium Rate', requestsPerSecond: 100, duration: 30 },
  { name: 'High Rate', requestsPerSecond: 200, duration: 30 }
];
```

## 📝 Relatórios

### **Estrutura do Relatório**
```json
{
  "timestamp": "2025-08-22T10:00:00.000Z",
  "testConfiguration": { ... },
  "summary": {
    "totalRequests": 5000,
    "successfulRequests": 4500,
    "failedRequests": 500,
    "rateLimitedRequests": 300,
    "securityBlockedRequests": 200,
    "successRate": "90.00%",
    "rateLimitEffectiveness": "85.71%"
  },
  "performance": {
    "averageResponseTime": "150.25ms",
    "p95": "450.00ms",
    "p99": "800.00ms"
  },
  "securityTests": { ... },
  "recommendations": [ ... ]
}
```

### **Métricas Importantes**
- **Success Rate**: Taxa de sucesso das requisições
- **Rate Limit Effectiveness**: Eficácia das proteções
- **Response Time**: Latência média e percentis
- **Error Rate**: Taxa de erros e falhas
- **Security Block Rate**: Taxa de bloqueio de ataques

### **Recomendações Automáticas**
- **CRITICAL**: Vulnerabilidades críticas detectadas
- **HIGH**: Problemas de segurança ou performance
- **MEDIUM**: Otimizações recomendadas
- **LOW**: Melhorias menores

## ⚙️ Configuração

### **Arquivo de Configuração**
```javascript
// config_testes.js
const CONFIGURACOES = {
  light: {
    duration: 30000,
    concurrentUsers: 10,
    requestsPerUser: 20,
    attackIntensity: 'low'
  }
  // ... outros perfis
};
```

### **Personalização**
```javascript
// Ajustar thresholds
const MONITORING_CONFIG = {
  metrics: {
    responseTime: {
      thresholds: {
        warning: 500,   // ms
        critical: 1000  // ms
      }
    }
  }
};
```

### **Variáveis de Ambiente**
```bash
# Configurar URL da API
export API_BASE_URL="http://localhost:3000"

# Configurar timeout
export TEST_TIMEOUT="300000"

# Configurar nível de log
export LOG_LEVEL="info"
```

## 🔧 Troubleshooting

### **Problemas Comuns**

#### **1. API não está rodando**
```bash
# Verificar se a API está ativa
curl http://localhost:3000/health

# Iniciar a API se necessário
cd ../
npm start
```

#### **2. Erro de dependências**
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

#### **3. Timeout de requisições**
```bash
# Ajustar timeout no config_testes.js
timeout: {
  request: 15000,  // Aumentar para 15s
  test: 600000     // Aumentar para 10min
}
```

#### **4. Muitas falhas de rate limiting**
```bash
# Verificar configurações de rate limiting na API
# Ajustar thresholds se necessário
# Verificar se o sistema está funcionando corretamente
```

### **Logs e Debugging**
```bash
# Ativar logs detalhados
export DEBUG="*"

# Executar com verbose
node run_tests.js heavy --verbose

# Ver logs em tempo real
tail -f logs/test_execution.log
```

## 📊 Exemplos de Uso

### **Cenário 1: Validação de Desenvolvimento**
```bash
# Teste rápido para desenvolvimento
node run_tests.js light

# Verificar apenas rate limiting
node run_tests.js security --config
```

### **Cenário 2: Validação de Staging**
```bash
# Teste intermediário para staging
node run_tests.js medium

# Foco em segurança
node run_tests.js security
```

### **Cenário 3: Validação de Produção**
```bash
# Teste completo para produção
node run_tests.js heavy

# Foco em performance
node run_tests.js performance
```

### **Cenário 4: Teste Contínuo**
```bash
# Executar testes periodicamente
while true; do
  node run_tests.js light
  sleep 300  # 5 minutos
done
```

## 🚨 Avisos Importantes

### **⚠️ Segurança**
- **Use apenas em ambientes de teste**
- **Não execute em produção sem autorização**
- **Monitore o sistema durante os testes**
- **Tenha plano de rollback preparado**

### **⚠️ Performance**
- **Testes pesados podem impactar o sistema**
- **Monitore recursos (CPU, memória, rede)**
- **Interrompa testes se necessário (Ctrl+C)**
- **Execute em horários de baixo tráfego**

### **⚠️ Dados**
- **Testes podem criar dados de teste**
- **Configure limpeza automática se necessário**
- **Faça backup antes de testes extensos**
- **Use banco de dados separado para testes**

## 🔄 Integração com CI/CD

### **GitHub Actions**
```yaml
name: Security Tests
on: [push, pull_request]
jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd testes
          npm install
      - name: Run security tests
        run: |
          cd testes
          node run_tests.js security
```

### **Jenkins Pipeline**
```groovy
pipeline {
  agent any
  stages {
    stage('Security Tests') {
      steps {
        dir('testes') {
          sh 'npm install'
          sh 'node run_tests.js security'
        }
      }
    }
  }
}
```

## 📞 Suporte

### **Documentação**
- **README Principal**: [../README.md](../README.md)
- **Análise Arquitetural**: [../ANALISE_ARQUITETURA.md](../ANALISE_ARQUITETURA.md)
- **Configurações**: [config_testes.js](config_testes.js)

### **Issues e Problemas**
- **GitHub Issues**: Reportar bugs e problemas
- **Pull Requests**: Contribuições e melhorias
- **Discussions**: Dúvidas e discussões

---

**Versão**: 1.0.0  
**Última Atualização**: Agosto 2025  
**Status**: ✅ Funcionando e Testado  
**Compatibilidade**: Node.js 18+, Task Management API v2.0.0
