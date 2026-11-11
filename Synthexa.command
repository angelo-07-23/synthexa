#!/bin/bash
# ============================================
#  Synthexa AIDBMS - Launcher (macOS / Linux)
# ============================================

cd "$(dirname "$0")"

# ---- Rileva Python ----
if command -v python3 &>/dev/null; then
    PY="python3"
elif command -v python &>/dev/null; then
    PY="python"
else
    echo "❌ Python non trovato. Installalo prima di continuare."
    read -p "Premi Invio per chiudere..."
    exit 1
fi

# ---- Installa dipendenze se necessario ----
$PY -c "import flask" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "📦 Installazione dipendenze..."
    $PY -m pip install -r requirements.txt
fi

# ---- Libera la porta ----
if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "freebsd"* ]]; then
    lsof -ti:5050 | xargs kill -9 2>/dev/null
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    fuser -k 5050/tcp 2>/dev/null
fi

# ---- Avvia ----
echo ""
echo "  ╔══════════════════════════════════╗"
echo "  ║       Synthexa AIDBMS            ║"
echo "  ║   http://localhost:5050          ║"
echo "  ╚══════════════════════════════════╝"
echo ""

# ---- Apri il browser ----
if [[ "$OSTYPE" == "darwin"* ]]; then
    (sleep 2 && open "http://localhost:5050") &
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    (sleep 2 && xdg-open "http://localhost:5050") &
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    (sleep 2 && start "http://localhost:5050") &
fi

$PY app.py
