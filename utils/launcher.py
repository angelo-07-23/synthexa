import webview
import subprocess
import time
import os
import signal
import sys

# --- CONFIGURAZIONE ---
APP_TITLE = "Synthexa AIDBMS"
FLASK_URL = "http://localhost:5050"

def start_flask():
    """Avvia il server Flask in background."""
    PYTHON_EXE = sys.executable
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cmd = [PYTHON_EXE, "src/app.py"]
    return subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, cwd=root_dir)

def main():
    # 1. Avvia Flask
    print("Avvio di Synthexa in corso...")
    proc = start_flask()
    
    # 2. Attendi che il server sia pronto
    time.sleep(2)
    
    # 3. Crea la finestra desktop nativa
    window = webview.create_window(
        APP_TITLE,
        FLASK_URL,
        width=1200,
        height=800,
        resizable=True,
        confirm_close=True
    )
    
    # 4. Funzione di chiusura pulita
    def on_closed():
        print("Chiusura applicazione...")
        if os.name == 'nt':  # Windows
            subprocess.call(['taskkill', '/F', '/T', '/PID', str(proc.pid)])
        else:  # Mac/Linux
            os.kill(proc.pid, signal.SIGTERM)
            
    # Avvia l'interfaccia
    webview.start(on_closed)

if __name__ == "__main__":
    main()
