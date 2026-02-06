@echo off
echo ========================================
echo SISTEMA COMPLETO - GESTAO DE LIMPEZA
echo ========================================
echo.

echo [1/3] Iniciando Backend (Porta 5000)...
start cmd /k "cd Backend && echo === BACKEND === && node server.js"

echo Aguardando backend iniciar...
timeout /t 3 /nobreak > nul

echo [2/3] Testando backend...
curl http://localhost:5000/api/health > nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Backend respondendo na porta 5000
) else (
    echo ❌ Backend nao responde
    echo Verifique o terminal do backend
    pause
    exit /b 1
)

echo [3/3] Iniciando Frontend (Porta 3001)...
start cmd /k "cd gestao-limpeza-frontend && echo === FRONTEND === && npm start"

echo.
echo ========================================
echo ✅ SISTEMA INICIADO!
echo ========================================
echo 🌐 Frontend: http://localhost:3001
echo ⚙️  Backend:  http://localhost:5000
echo 📊 Health:   http://localhost:5000/api/health
echo ========================================
echo Pressione qualquer tecla para fechar...
pause > nul