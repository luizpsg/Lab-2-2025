@echo off
chcp 65001 >nul
echo.
echo 🧪 DEMONSTRAÇÃO DOS TESTES DE ESTRESSE E SEGURANÇA
echo ==================================================
echo.

echo 📋 Verificando se a API está rodando...
curl -s http://localhost:3000/health >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ API não está rodando em http://localhost:3000
    echo 💡 Inicie a API primeiro com: npm start
    echo.
    pause
    exit /b 1
)

echo ✅ API está rodando!
echo.

echo 🎯 Escolha um perfil de teste:
echo.
echo 🟢 1. Light    - Teste básico (10 usuários, 30s)
echo 🟡 2. Medium   - Teste intermediário (25 usuários, 1min)
echo 🔴 3. Heavy    - Teste intensivo (50 usuários, 2min)
echo 🛡️  4. Security - Foco em segurança
echo 📊 5. Performance - Foco em performance
echo ❓ 6. Ajuda
echo.
set /p choice="Digite o número do perfil (1-6): "

if "%choice%"=="1" (
    echo.
    echo 🚀 Executando teste LIGHT...
    cd testes
    node run_tests.js light
) else if "%choice%"=="2" (
    echo.
    echo 🚀 Executando teste MEDIUM...
    cd testes
    node run_tests.js medium
) else if "%choice%"=="3" (
    echo.
    echo 🚀 Executando teste HEAVY...
    cd testes
    node run_tests.js heavy
) else if "%choice%"=="4" (
    echo.
    echo 🚀 Executando teste SECURITY...
    cd testes
    node run_tests.js security
) else if "%choice%"=="5" (
    echo.
    echo 🚀 Executando teste PERFORMANCE...
    cd testes
    node run_tests.js performance
) else if "%choice%"=="6" (
    echo.
    echo 📚 Exibindo ajuda...
    cd testes
    node run_tests.js --help
) else (
    echo.
    echo ❌ Opção inválida!
    echo 💡 Execute o script novamente e escolha uma opção válida.
)

echo.
echo ✅ Teste concluído!
echo 📊 Verifique o relatório gerado para detalhes.
echo.
pause
