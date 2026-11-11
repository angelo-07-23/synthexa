# Synthexa AIDBMS

**Synthexa AIDBMS** è un assistente AI avanzato per l'interrogazione di database SQLite. Trasforma il linguaggio naturale in query SQL precise, offrendo un'interfaccia moderna e sicura per la gestione dei dati.

## 🚀 Caratteristiche
- **Text-to-SQL**: Interroga il database in linguaggio naturale.
- **Interfaccia Premium**: Design dark mode ottimizzato e responsivo.
- **Sicurezza**: Conferma esplicita richiesta per operazioni di modifica (INSERT/UPDATE/DELETE).
- **Explorer**: Visualizzazione dinamica dello schema del database.
- **Cross-Platform**: Utilizzabile via browser o come app desktop nativa.

## 🛠 Setup Rapido
1. Assicurati di avere [Ollama](https://ollama.com/) installato e il modello `gemma4:e4b` scaricato.
2. Su Mac, avvia semplicemente `Synthexa.command`.
3. In alternativa:
   ```bash
   pip install -r requirements.txt
   python src/app.py
   ```

## 🔒 Privacy e dati
- I dati in `db/ecommerce.db` sono **fittizi e sintetici** (email su dominio riservato `example.com`).
- I database caricati dall'utente (`db/working_database.db`) e i file locali/`.sqlite` sono esclusi da Git tramite `.gitignore`.
- Non committare mai database reali o file `.env` con credenziali.
