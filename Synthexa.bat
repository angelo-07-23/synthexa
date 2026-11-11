@echo off
REM ============================================
REM  Synthexa AIDBMS - Launcher (Windows)
REM ============================================
cd /d "%~dp0"

REM ---- Rileva Python ----
where python >nul 2>nul
if %errorlevel% neq 0 (
    where python3 >nul 2>nul
    if %errorlevel% neq 0 (
        echo Python non trovato. Installalo da https://python.org
        pause
        exit /b 1
    )
    set PY=python3
) else (
    set PY=python
)

REM ---- Installa dipendenze se necessario ----
%PY% -c "import flask" >nul 2>nul
if %errorlevel% neq 0 (
    echo Installazione dipendenze...
    %PY% -m pip install -r requirements.txt
)

REM ---- Libera la porta ----
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5050 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

REM ---- Avvia ----
echo.
echo   Synthexa AIDBMS
echo   http://localhost:5050
echo.

start http://localhost:5050
%PY% app.py
pause
