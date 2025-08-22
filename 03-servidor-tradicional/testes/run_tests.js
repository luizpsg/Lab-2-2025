#!/usr/bin/env node

/**
 * 🚀 Script de Execução de Testes de Estresse e Segurança
 * 
 * Uso:
 *   node run_tests.js                    # Teste padrão (médio)
 *   node run_tests.js light             # Teste leve
 *   node run_tests.js heavy             # Teste pesado
 *   node run_tests.js security          # Teste de segurança
 *   node run_tests.js performance       # Teste de performance
 *   node run_tests.js --help            # Ajuda
 */

const { runSecurityStressTest } = require('./estresse_seguranca');
const { CONFIGURACOES } = require('./config_testes');

// Função para exibir ajuda
function showHelp() {
  console.log(`
🧪 Testes de Estresse e Segurança - Task Management API

📋 USO:
  node run_tests.js [perfil] [opções]

📊 PERFIS DISPONÍVEIS:
  light        🟢 Teste básico para desenvolvimento (10 usuários, 30s)
  medium       🟡 Teste intermediário para staging (25 usuários, 1min)
  heavy        🔴 Teste intensivo para produção (50 usuários, 2min)
  security     🛡️  Foco em vulnerabilidades e ataques
  performance  📊 Foco em performance e escalabilidade

⚙️  OPÇÕES:
  --help       Exibir esta ajuda
  --config     Mostrar configurações do perfil selecionado
  --monitor    Ativar monitoramento em tempo real
  --report     Gerar relatório detalhado

📝 EXEMPLOS:
  node run_tests.js light              # Teste leve
  node run_tests.js heavy --monitor    # Teste pesado com monitoramento
  node run_tests.js security --report  # Teste de segurança com relatório

⚠️  AVISOS:
  - Certifique-se de que a API está rodando em http://localhost:3000
  - Testes pesados podem impactar o sistema
  - Use apenas em ambientes de teste
  - Monitore o sistema durante os testes

🔧 CONFIGURAÇÃO:
  Edite config_testes.js para personalizar os testes
  `);
}

// Função para exibir configurações
function showConfig(profile) {
  const config = CONFIGURACOES[profile];
  if (!config) {
    console.error(`❌ Perfil '${profile}' não encontrado`);
    return;
  }

  console.log(`
⚙️  CONFIGURAÇÃO DO PERFIL: ${config.name.toUpperCase()}
${'='.repeat(50)}
📝 Descrição: ${config.description}
⏱️  Duração: ${config.duration / 1000}s
👥 Usuários simultâneos: ${config.concurrentUsers}
📨 Requisições por usuário: ${config.requestsPerUser}
🎯 Intensidade de ataque: ${config.attackIntensity}
🛡️  Testes de segurança: ${config.securityTests.join(', ')}
🔒 Testes de rate limiting: ${config.rateLimitTests ? 'Sim' : 'Não'}
📊 Testes de performance: ${config.performanceTests ? 'Sim' : 'Não'}
🌊 Simulação de DDoS: ${config.ddosSimulation ? 'Sim' : 'Não'}
  `);
}

// Função principal
async function main() {
  const args = process.argv.slice(2);
  const profile = args[0] || 'medium';
  const options = args.slice(1);

  // Verificar se é uma solicitação de ajuda
  if (options.includes('--help') || profile === '--help') {
    showHelp();
    return;
  }

  // Verificar se é uma solicitação de configuração
  if (options.includes('--config')) {
    showConfig(profile);
    return;
  }

  // Verificar se o perfil existe
  if (!CONFIGURACOES[profile]) {
    console.error(`❌ Perfil '${profile}' não encontrado`);
    console.log('📋 Perfis disponíveis:', Object.keys(CONFIGURACOES).join(', '));
    console.log('💡 Use --help para mais informações');
    return;
  }

  // Exibir informações do teste
  const config = CONFIGURACOES[profile];
  console.log(`
🚀 INICIANDO TESTE: ${config.name.toUpperCase()}
${'='.repeat(50)}
📝 ${config.description}
⏱️  Duração: ${config.duration / 1000}s
👥 Usuários simultâneos: ${config.concurrentUsers}
📨 Requisições por usuário: ${config.requestsPerUser}
🎯 Intensidade de ataque: ${config.attackIntensity}
🛡️  Testes de segurança: ${config.securityTests.join(', ')}
🔒 Testes de rate limiting: ${config.rateLimitTests ? 'Sim' : 'Não'}
📊 Testes de performance: ${config.performanceTests ? 'Sim' : 'Não'}
🌊 Simulação de DDoS: ${config.ddosSimulation ? 'Sim' : 'Não'}

⚠️  AVISOS:
  - Certifique-se de que a API está rodando
  - Este teste pode impactar o sistema
  - Use apenas em ambientes de teste
  - Pressione Ctrl+C para interromper

⏳ Iniciando em 5 segundos...
  `);

  // Aguardar 5 segundos para permitir cancelamento
  await new Promise(resolve => {
    let countdown = 5;
    const interval = setInterval(() => {
      process.stdout.write(`\r⏳ Iniciando em ${countdown} segundos...`);
      countdown--;
      if (countdown < 0) {
        clearInterval(interval);
        process.stdout.write('\r🚀 Iniciando teste...\n\n');
        resolve();
      }
    }, 1000);
  });

  try {
    // Executar o teste
    await runSecurityStressTest();

    console.log(`
✅ TESTE CONCLUÍDO COM SUCESSO!
${'='.repeat(50)}
📊 Verifique o relatório gerado para detalhes completos
💡 Use as recomendações para melhorar a segurança e performance
🔄 Execute outros perfis para testes adicionais
    `);

  } catch (error) {
    console.error(`
❌ ERRO DURANTE O TESTE
${'='.repeat(50)}
🔍 Erro: ${error.message}
📝 Stack: ${error.stack}
💡 Verifique se a API está rodando e tente novamente
    `);
    process.exit(1);
  }
}

// Capturar Ctrl+C para interrupção graciosa
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Teste interrompido pelo usuário');
  console.log('🔄 Para executar novamente, use: node run_tests.js [perfil]');
  process.exit(0);
});

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
