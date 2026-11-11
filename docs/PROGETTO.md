# Synthexa AIDBMS — Documentazione Tecnica

Synthexa AIDBMS è un assistente intelligente per la gestione e l'interrogazione di database SQLite tramite linguaggio naturale. Il progetto combina la potenza dei modelli linguistici locali (Ollama) con un'interfaccia web moderna, premium e altamente responsiva.

## 📁 Struttura del Progetto

- **`src/app.py`**: Il "cervello" del backend. Un server Flask che gestisce le rotte API, la comunicazione con Ollama per la generazione SQL e l'esecuzione delle query sul database.
- **`src/templates/index.html`**: L'interfaccia utente (UI). Contiene la struttura HTML della chat e tutta la logica JavaScript (AJAX) per l'interazione in tempo reale.
- **`src/static/style.css`**: Il sistema di design. Implementa un'estetica "dark-mode" premium ispirata a Tokyo Night, con animazioni fluide e componenti ottimizzati.
- **`db/`**: Cartella destinata ai database. Contiene `ecommerce.db` (demo) e riceve i database caricati dall'utente.
- **`utils/launcher.py`**: Uno script Python che trasforma l'applicazione web in una vera app desktop nativa utilizzando la libreria `pywebview`.
- **`Synthexa.command`**: Un file eseguibile per Mac che automatizza l'installazione delle dipendenze e l'avvio del server con apertura automatica del browser.
- **`assets/`**: Contiene le risorse grafiche, come il logo dell'applicazione.

---

## 🚀 Funzionalità Principali

### 1. Interrogazione in Linguaggio Naturale
L'utente può porre domande complesse (es. *"Qual è il fatturato totale del mese scorso?"*) e il sistema genera automaticamente la query SQL corretta basandosi sullo schema del database caricato.

### 2. Gestione Sicura delle Modifiche
Per evitare modifiche accidentali, il sistema distingue tra query di lettura (`SELECT`) e query di modifica (`INSERT`, `UPDATE`, `DELETE`). Queste ultime richiedono una conferma esplicita dell'utente prima di essere eseguite.

### 3. Database Explorer & Upload
La sidebar permette di:
- Caricare un file `.db` o `.sqlite` personalizzato.
- Visualizzare in tempo reale lo schema del database (tabelle e colonne) tramite un menu a fisarmonica (Accordion).
- Monitorare lo stato della connessione al file.

### 4. Risultati Intelligenti
I dati restituiti vengono formattati in modo dinamico:
- Se il risultato è un valore singolo, viene mostrato come una **Card Metrica** (es. "Prezzo Totale: € 1.250,00").
- Se il risultato è una lista, viene mostrata una **Tabella Interattiva**.

---

## 🛠 Tecnologia e Stack

- **Backend**: Python, Flask, Waitress (Server di produzione).
- **AI**: Ollama (Modello Gemma 2 2b/4b ottimizzato per SQL).
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (ES6+).
- **Database**: SQLite3.
- **Desktop Wrapper**: PyWebView (opzionale).

---

## 💻 Istruzioni per l'Avvio

1. **Requisiti**: Assicurati di avere Python installato e Ollama attivo con il modello `gemma4:e4b` (o configurane uno diverso in `src/app.py`).
2. **Avvio Standard (Mac)**: Fai doppio clic su `Synthexa.command`.
3. **Avvio Desktop**: Esegui `python utils/launcher.py`.
4. **Accesso Web**: Il server sarà disponibile su `http://localhost:5050`.

---

**Sviluppato con cura per un'esperienza di gestione database fluida e moderna.**
