@echo off
chcp 65001 >nul

echo Проверка порта 3000...
powershell -Command "if (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue) { echo 'Порт занят, очищаю...'; Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force } else { echo 'Порт свободен.' }"

:: ============================================
:: ЧТЕНИЕ КОНФИГУРАЦИИ ИЗ .ENV
:: ============================================
:: ОТКЛЮЧЕНО: Vite теперь читает .env напрямую для ARCADE_LOG_* переменных
:: Это позволяет динамически переключать логи без перезапуска сессии
:: Токены Claude Code по-прежнему читаются ниже

:: :: Чтение переменных из .env (поддерживает комментарии и пустые строки)
:: for /f "tokens=*" %%a in ('type .env ^| findstr /v "^#" ^| findstr /v "^$" ^| findstr "="') do set %%a

:: Читаем только токены Claude Code из .env
for /f "tokens=1,2 delims==" %%a in ('type .env ^| findstr /b "ANTHROPIC_"') do set %%a=%%b

:: ============================================
:: ДОБАВЛЕНИЕ BUN В PATH
:: ============================================
set PATH=%PATH%;%USERPROFILE%\.bun\bin

:: ============================================
:: 1. ЗАПУСК CLAUDE CODE В POWERSHELL
:: ============================================
cd /d "%CD%"
echo Запуск Claude Code в PowerShell...

:: Вариант A: PowerShell с переменными окружения
:: start "Claude Code (RU)" powershell -NoExit -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $env:ANTHROPIC_AUTH_TOKEN='%ANTHROPIC_AUTH_TOKEN%'; cd '%CD%'; npx @anthropic-ai/claude-code 'Phaser ArcadeQuiz: MCP filesystem active. Загрузи rules из .claude/rules/'"
start "Claude Code (RU)" powershell -NoExit -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $env:ANTHROPIC_AUTH_TOKEN='%ANTHROPIC_AUTH_TOKEN%'; cd '%CD%'; npx @anthropic-ai/claude-code 'Инициализируй сессию: 1. Прочитай 00-memory.md и CONTEXT.md. 2. Используй chrome-devtools-mcp. 3. Выполни npm run dev:clean. 4. Открой localhost:3000 в Chrome.'"

timeout /t 2 >nul
exit
