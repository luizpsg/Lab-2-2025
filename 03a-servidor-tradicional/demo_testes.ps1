# 🧪 DEMONSTRAÇÃO DOS TESTES DE ESTRESSE E SEGURANÇA
# ==================================================

Write-Host ""
Write-Host "🧪 DEMONSTRAÇÃO DOS TESTES DE ESTRESSE E SEGURANÇA" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se a API está rodando
Write-Host "📋 Verificando se a API está rodando..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ API está rodando!" -ForegroundColor Green
} catch {
    Write-Host "❌ API não está rodando em http://localhost:3000" -ForegroundColor Red
    Write-Host "💡 Inicie a API primeiro com: npm start" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host ""

# Menu de seleção
Write-Host "🎯 Escolha um perfil de teste:" -ForegroundColor Cyan
Write-Host ""
Write-Host "🟢 1. Light    - Teste básico (10 usuários, 30s)" -ForegroundColor Green
Write-Host "🟡 2. Medium   - Teste intermediário (25 usuários, 1min)" -ForegroundColor Yellow
Write-Host "🔴 3. Heavy    - Teste intensivo (50 usuários, 2min)" -ForegroundColor Red
Write-Host "🛡️  4. Security - Foco em segurança" -ForegroundColor Magenta
Write-Host "📊 5. Performance - Foco em performance" -ForegroundColor Blue
Write-Host "❓ 6. Ajuda" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Digite o número do perfil (1-6)"

Write-Host ""

switch ($choice) {
    "1" {
        Write-Host "🚀 Executando teste LIGHT..." -ForegroundColor Green
        Set-Location "testes"
        node run_tests.js light
    }
    "2" {
        Write-Host "🚀 Executando teste MEDIUM..." -ForegroundColor Yellow
        Set-Location "testes"
        node run_tests.js medium
    }
    "3" {
        Write-Host "🚀 Executando teste HEAVY..." -ForegroundColor Red
        Set-Location "testes"
        node run_tests.js heavy
    }
    "4" {
        Write-Host "🚀 Executando teste SECURITY..." -ForegroundColor Magenta
        Set-Location "testes"
        node run_tests.js security
    }
    "5" {
        Write-Host "🚀 Executando teste PERFORMANCE..." -ForegroundColor Blue
        Set-Location "testes"
        node run_tests.js performance
    }
    "6" {
        Write-Host "📚 Exibindo ajuda..." -ForegroundColor Gray
        Set-Location "testes"
        node run_tests.js --help
    }
    default {
        Write-Host "❌ Opção inválida!" -ForegroundColor Red
        Write-Host "💡 Execute o script novamente e escolha uma opção válida." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Teste concluído!" -ForegroundColor Green
Write-Host "📊 Verifique o relatório gerado para detalhes." -ForegroundColor Cyan
Write-Host ""

# Voltar ao diretório original
Set-Location ".."

Read-Host "Pressione Enter para sair"
