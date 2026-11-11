# Synthexa AIDBMS — Documento di Presentazione

## 1. Introduzione e Obiettivo

**Synthexa AIDBMS** è un assistente intelligente per la gestione e l'interrogazione di database SQLite tramite linguaggio naturale (Text-to-SQL).

### Obiettivo del Progetto

Consentire a utenti senza conoscenze di SQL di interrogare, esplorare e modificare un database usando semplicemente il linguaggio naturale (italiano), grazie all'integrazione con un modello linguistico (LLM) eseguito in locale tramite Ollama.

### Ambito Applicativo

Il progetto dimostra l'integrazione pratica tra:
- **AI / LLM** (Ollama + Gemma)
- **Sviluppo Web** (Flask, Vanilla HTML/CSS/JS)
- **Database** (SQLite)
- **Desktop Application** (PyWebView)
- **User Experience Design** (design system "Tokyo Night" personalizzato)

---

## 2. Tecnologie Utilizzate (Stack Tecnologico)

| Livello | Tecnologia | Versione | Ruolo |
|---------|-----------|----------|-------|
| **Linguaggio Backend** | Python | 3.13 | Core dell'applicazione |
| **Web Framework** | Flask | 3.0+ | Server REST API |
| **Server di Produzione** | Waitress | 3.0+ | WSGI server (production-grade) |
| **AI / LLM** | Ollama | — | Runtime per modelli linguistici locali |
| **Modello LLM** | Gemma 2 (gemma4:e4b) | — | Generazione SQL da linguaggio naturale |
| **Client Python LLM** | ollama (libreria) | >=0.1.6 | Interfaccia Python per Ollama |
| **Database** | SQLite3 | — | Database relazionale embedded |
| **Desktop Wrapper** | PyWebView | 4.4.1+ | Trasforma l'app web in finestra nativa |
| **Frontend** | HTML5, CSS3, JavaScript ES6+ | — | Interfaccia utente (Vanilla, no framework) |
| **Libreria Grafici** | Chart.js | 4.4.0 (CDN) | Rendering grafici a barre |
| **Font** | Inter | Google Fonts CDN | Tipografia moderna e leggibile |

### Perché Ollama?

Ollama permette di eseguire modelli linguistici **localmente**, senza dipendenze da API cloud. Vantaggi:
- Privacy totale (i dati del database non lasciano mai il computer)
- Nessun costo di API
- Latenza ridotta
- Funzionamento offline

### Perché SQLite?

Database embedded, senza server, portatile — perfetto per un'applicazione desktop. Il file `.db` è auto-contenuto e trasportabile.

### Perché Vanilla JavaScript (No Framework)?

Scelta deliberata per dimostrare competenza pura nei fondamenti del web, senza dipendere da framework come React/Vue. Il progetto ha solo **4 dipendenze Python** — nessuna dipendenza npm.

---

## 3. Architettura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      USER INTERFACE                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Browser (o PyWebView desktop window)                 │  │
│  │  ┌──────────┐  ┌──────────────────────────────────┐  │  │
│  │  │ Sidebar  │  │  Chat Area                      │  │  │
│  │  │ - Config │  │  ┌────────────────────────────┐  │  │  │
│  │  │ - Schema │  │  │ Messaggi (user + assistant)│  │  │  │
│  │  │ - History│  │  │ - Metric Cards              │  │  │  │
│  │  │          │  │  │ - Tabelle con esportazione  │  │  │  │
│  │  │          │  │  │ - Grafici a barre (Chart.js)│  │  │  │
│  │  │          │  │  │ - Banner di conferma        │  │  │  │
│  │  │          │  │  └────────────────────────────┘  │  │  │
│  │  │          │  │  ┌────────────────────────────┐  │  │  │
│  │  │          │  │  │ Barra Input + Pulsante Invio│  │  │  │
│  │  └──────────┘  │  └────────────────────────────┘  │  │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP REST API (porta 5050)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    FLASK BACKEND (Waitress)                  │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │   routes.py   │  │  database.py  │  │    llm.py      │  │
│  │               │  │               │  │                │  │
│  │ /api/query ───┼──│ get_db_schema │  │ generate_sql() │  │
│  │ /api/execute  │  │ execute_sql() │  │ list_models()  │  │
│  │ /api/schema   │  │ is_chart_...  │  └───────┬────────┘  │
│  │ /api/upload   │  └───────┬───────┘          │           │
│  │ /api/models   │          │                  │           │
│  └───────────────┘          │                  │           │
└─────────────────────────────┼──────────────────┼───────────┘
                              │                  │
                              ▼                  ▼
                     ┌──────────────┐   ┌──────────────┐
                     │   SQLite DB  │   │    Ollama    │
                     │  (locale)    │   │  (locale)    │
                     │              │   │ gemma4:e4b   │
                     └──────────────┘   └──────────────┘
```

### Flusso di una Richiesta

1. **Utente** digita una domanda in italiano nella chat (es. "Qual è il fatturato totale del mese scorso?")
2. **Frontend (app.js)** invia la domanda a `POST /api/query` con:
   - La domanda (`question`)
   - La cronologia della conversazione (`history`)
   - Il percorso del database (`db_path`)
   - Il modello LLM selezionato (`model`)
3. **Backend (routes.py)**: 
   - Legge lo schema del database (`get_db_schema`)
   - Invia domanda + schema al LLM via Ollama (`generate_sql`)
   - Riceve la query SQL generata
   - Classifica la query: `SELECT` vs `INSERT/UPDATE/DELETE/CREATE/DROP/ALTER`
   - Se è una modifica → richiede conferma all'utente
   - Se è una lettura → esegue la query su SQLite
   - Se la SELECT fallisce → **auto-retry** (fino a 3 tentativi, re-inviando l'errore al LLM)
   - Classifica i risultati: `is_metric` (singolo valore), `is_chart` (2 colonne numeriche), oppure tabella standard
4. **Frontend** riceve la risposta e renderizza:
   - **Card metrica** per valori singoli (con formattazione automatica valuta €)
   - **Grafico a barre** (Chart.js) per dati categorici, con toggle tabella
   - **Tabella interattiva** per risultati multi-colonna, con esportazione CSV/JSON
   - **Banner di conferma** per query di modifica con pulsanti ESEGUI/ANNULLA

---

## 4. Struttura del Progetto

```
synthexa/
│
├── app.py                          # Entry point — Flask + Waitress
├── requirements.txt                # Dipendenze Python (4)
├── README.md                       # Guida rapida
├── Synthexa.command                # Launcher macOS/Linux (bash)
├── Synthexa.bat                    # Launcher Windows (batch)
│
├── src/
│   ├── routes.py                   # API REST (6 endpoint)
│   ├── database.py                 # Lettura schema + esecuzione query SQLite
│   ├── llm.py                      # Integrazione Ollama — generazione SQL
│   ├── templates/
│   │   └── index.html              # SPA — interfaccia utente (95 righe)
│   └── static/
│       ├── css/
│       │   └── style.css           # Design system completo (824 righe)
│       └── js/
│           └── app.js              # Logica frontend (682 righe)
│
├── db/
│   └── ecommerce.db                # Database SQLite demo
│
├── docs/
│   ├── PROGETTO.md                 # Documentazione tecnica esistente
│   └── PRESENTAZIONE.md            # (questo file)
│
└── utils/
    └── launcher.py                 # Desktop app wrapper (PyWebView)
```

### Dimensione del Codice

| File | Righe | Descrizione |
|------|-------|-------------|
| `app.py` | 32 | Bootstrap del server |
| `src/routes.py` | 149 | API endpoint |
| `src/database.py` | 73 | Operazioni SQLite |
| `src/llm.py` | 51 | Integrazione Ollama |
| `src/templates/index.html` | 95 | Struttura HTML |
| `src/static/js/app.js` | 682 | Logica frontend completa |
| `src/static/css/style.css` | 824 | Design system completo |
| `utils/launcher.py` | 49 | Desktop wrapper |
| **Totale** | **~1955** | Righe di codice totali |

---

## 5. API REST — Endpoint

### 5.1 `GET /`
Serve la Single Page Application (`index.html`).

### 5.2 `GET /api/schema?db_path=...`
Restituisce lo schema del database in formato JSON:
```json
{
  "schema": {
    "clienti": ["id", "nome", "email", "citta"],
    "ordini": ["id", "cliente_id", "prodotto", "prezzo", "data"]
  },
  "error": null
}
```
Implementazione: `get_db_schema()` in `database.py` usa `sqlite_master` e `PRAGMA table_info()`.

### 5.3 `POST /api/query` (Core)
Riceve una domanda in linguaggio naturale, genera SQL, lo esegue, restituisce risultati.

**Request:**
```json
{
  "question": "Qual è il totale delle vendite?",
  "history": [...],
  "db_path": "db/ecommerce.db",
  "model": "gemma4:e4b"
}
```

**Response SELECT (metric):**
```json
{
  "type": "SELECT",
  "sql": "SELECT SUM(prezzo) FROM ordini;",
  "columns": ["SUM(prezzo)"],
  "rows": [[125000.00]],
  "is_metric": true,
  "is_chart": false,
  "metric_label": "SUM(prezzo)",
  "metric_value": 125000.00,
  "error": null
}
```

**Response MODIFY (richiede conferma):**
```json
{
  "type": "MODIFY",
  "sql": "INSERT INTO clienti (nome, email) VALUES ('Mario Rossi', 'mario@example.com');",
  "error": null
}
```

**Smart Retry:** Se una query SELECT fallisce, il sistema re-invia l'errore al LLM fino a 3 volte per auto-correzione.

### 5.4 `POST /api/execute`
Esegue una query SQL pre-confermata (per INSERT/UPDATE/DELETE).

**Request:**
```json
{
  "sql": "INSERT INTO clienti (nome, email) VALUES ('Mario Rossi', 'mario@example.com');",
  "db_path": "db/ecommerce.db"
}
```

**Response:**
```json
{ "success": true, "error": null }
```

### 5.5 `POST /api/upload`
Carica un file `.db` o `.sqlite` tramite `FormData`. Salva il file come `db/working_database.db`.

### 5.6 `GET /api/models`
Restituisce la lista dei modelli Ollama installati localmente.

**Response:**
```json
{ "models": ["gemma4:e4b", "llama3:8b", "codellama:7b"], "error": null }
```

---

## 6. Componenti Software in Dettaglio

### 6.1 `app.py` — Entry Point (32 righe)

- Aggiunge `src/` al `sys.path` per permettere import relativi
- Configura Flask con cartelle `templates/` e `static/` personalizzate dentro `src/`
- Registra le route da `routes.py`
- In produzione: avvia **Waitress** su `0.0.0.0:5050` (multi-threaded, production-grade)
- In sviluppo: fallback al server Flask integrato (con log ridotti)
- Stampa banner ASCII all'avvio

### 6.2 `src/routes.py` — API Routes (149 righe)

File centrale che orchestra tutto il backend. Contiene la funzione `register_routes(app)`.

**Logica chiave di `/api/query`:**
1. Riceve domanda, cronologia, percorso DB e modello
2. Chiama `get_db_schema()` per ottenere lo schema
3. Costruisce i messaggi: cronologia + nuova domanda
4. Chiama `generate_sql()` che interroga Ollama
5. **Classificazione query**: estrae la prima parola dell'SQL per determinare se è una SELECT o una modifica (INSERT/UPDATE/DELETE/CREATE/DROP/ALTER)
6. Per le modifiche → restituisce `type: "MODIFY"` **senza eseguire**
7. Per le SELECT → esegue con `execute_sql()`
8. **Smart Retry** (fino a 3 tentativi): se la SELECT fallisce, invia l'errore al LLM per auto-correzione
9. Classifica il risultato:
   - `is_metric`: singola riga, singola colonna → card metrica
   - `is_chart`: 2 colonne con valori numerici e ≥2 righe → grafico
   - altrimenti → tabella standard

### 6.3 `src/database.py` — Database Layer (73 righe)

Tre funzioni principali:

#### `get_db_schema(db_path) -> Tuple[Dict, str]`
- Apre la connessione SQLite
- Interroga `sqlite_master` per ottenere tutte le tabelle (escludendo `sqlite_*`)
- Per ogni tabella, esegue `PRAGMA table_info()` per ottenere i nomi delle colonne
- Restituisce sia un dizionario `{tabella: [colonne]}` che una descrizione testuale per il prompt LLM

#### `is_chart_eligible(columns, rows) -> bool`
Euristica per determinare se i risultati sono adatti a un grafico:
- Esattamente 2 colonne
- La seconda colonna contiene valori numerici
- Almeno 2 righe di dati

#### `execute_sql(query, db_path) -> Tuple[columns, rows, error, type]`
- Esegue la query SQL
- Per SELECT: restituisce colonne e righe
- Per INSERT/UPDATE/DELETE ecc.: usa `executescript()` che supporta più istruzioni
- Gestione errori: restituisce il messaggio d'errore invece di crashare

### 6.4 `src/llm.py` — LLM Integration (51 righe)

#### `generate_sql(messages, schema_text, model) -> str`

Il cuore dell'AI. Costruisce un **prompt di sistema** altamente specializzato:

```
Sei Synthexa AIDBMS, esperto SQL specializzato in SQLite.
SCHEMA: [schema del database]

REGOLE MANDATORIE:
1. Rispondi SOLO con codice SQL puro. Niente markdown, niente spiegazioni.
2. Usa nomi di tabelle e colonne ESATTAMENTE come indicati nello schema.
3. Per SQLite: usa CURRENT_DATE (senza parentesi) per la data attuale.
4. Auto-Increment: In caso di INSERT, NON specificare mai la colonna 'id'.
5. Alias: Usa alias SOLO nelle SELECT (nelle JOIN). NON usare alias in DELETE/UPDATE.
6. Separa sempre più comandi SQL con ';'.
7. Per cercare nomi o testi usa LIKE invece di '='.
```

**Gestione contesto:**
- Mantiene solo gli ultimi 5 messaggi della cronologia per evitare di superare la finestra di contesto
- Pulisce eventuali frammenti di markdown dalla risposta (```sql ... ```)

#### `list_models() -> list`
Interroga l'API di Ollama per elencare i modelli installati.

### 6.5 `src/templates/index.html` — SPA (95 righe)

Singola pagina HTML5 con struttura semantica:

```
<body>
  <button> ☰ Toggle Sidebar
  <aside>  Sidebar
    ├── Pulsante Impostazioni
    ├── Configurazione Database (percorso / upload)
    ├── Selezione Modello AI
    ├── Pulsante Reset Sessione
    ├── Cronologia Chat
    └── Database Explorer (schema a fisarmonica)
  <main>   Main Area
    ├── Chat Area (messaggi)
    └── Chat Input (input + pulsante invio)
```

Dipendenze esterne:
- Chart.js 4.4.0 da CDN
- Google Fonts "Inter" da CDN (importato via CSS)

### 6.6 `src/static/js/app.js` — Frontend Logic (682 righe)

Applicazione JavaScript senza framework, strutturata con un oggetto globale `state`:

```javascript
const state = {
    dbPath: 'db/ecommerce.db',
    model: '',
    messages: [],       // Cronologia per il LLM
    pendingSql: null,   // SQL in attesa di conferma
    schema: null        // Schema del database
};
```

#### Funzionalità implementate:

**Interfaccia Utente:**
- Toggle sidebar (collassa/espandi)
- Pannello impostazioni con animazione slide-down
- Radio button per modalità: percorso locale vs upload file
- Debounce sull'input del percorso DB (500ms)
- Drag-and-drop / file picker per upload database
- Selezione modello AI con persistenza in `localStorage`

**Gestione Chat:**
- Invio messaggi via Enter (no Shift+Enter)
- Freccia SU/GIU' per navigare la cronologia delle query
- Indicatore di digitazione animato (3 pallini con bounce)
- Animazione di entrata messaggi (fade-in + slide-up)

**Rendering Risultati:**

| Tipo Risultato | Rendering | Dettagli |
|----------------|-----------|----------|
| **Metrica** | Card con valore grande | Formattazione automatica valuta (€), rilevamento keyword (prezzo, totale, fatturato...) |
| **Grafico** | Chart.js bar chart | Colori tema, toggle grafico↔tabella, tooltip personalizzati |
| **Tabella** | Tabella HTML interattiva | Hover sulle righe, pulsanti Esporta CSV / Esporta JSON |
| **Modifica** | Banner giallo di warning | Preview SQL, pulsanti ESEGUI (verde) / ANNULLA (rosso) |
| **Errore** | Messaggio rosso | Mostra il messaggio di errore |
| **Auto-corretto** | Badge "Auto-Corretto" | Mostrato quando il retry ha successo |

**Esportazione Dati:**
- CSV: download lato client via Blob, con escaping corretto delle virgolette
- JSON: download lato client con formattazione pretty-print

**Cronologia Query:**
- Salva fino a 50 query in `localStorage`
- Click su una voce della cronologia → riproduce il risultato
- Pulsante cestino per eliminare singole voci
- Navigazione con frecce nell'input

**Funzioni di utilità:**
- `escapeHtml()`: sanitizzazione dell'input per prevenire XSS
- `formatMetricLabel()`: traduzione funzioni SQL → italiano (SUM→Totale, COUNT→Conteggio, AVG→Media, MAX→Massimo, MIN→Minimo)
- `copyToClipboard()`: copia testo negli appunti
- `downloadFile()`: download lato client via Blob e URL.createObjectURL

### 6.7 `src/static/css/style.css` — Design System (824 righe)

Design system completo "dark mode" ispirato a Tokyo Night.

#### Palette di Colori (CSS Variables)

| Variabile | Colore | Uso |
|-----------|--------|-----|
| `--bg` | `#09090b` | Sfondo principale (quasi nero) |
| `--bg-surface` | `#121214` | Superfici rialzate (sidebar, card) |
| `--bg-elevated` | `#18181b` | Elementi elevati (input, select) |
| `--text` | `#e4e4e7` | Testo primario (bianco caldo) |
| `--text-secondary` | `#71717a` | Testo secondario (grigio) |
| `--text-tertiary` | `#3f3f46` | Testo terziario (grigio scuro) |
| `--accent` | `#a78bfa` | Colore accento (viola) |
| `--accent-soft` | `rgba(167,139,250,0.08)` | Accento trasparente |
| `--accent-hover` | `#c4b5fd` | Accento hover (viola chiaro) |
| `--success` | `#34d399` | Successo (verde) |
| `--error` | `#f87171` | Errore (rosso) |
| `--warning` | `#fbbf24` | Warning (giallo) |

#### Componenti Stilizzati

| Componente | Dettagli |
|------------|----------|
| **Sidebar** | 270px, scrollabile, border-right, transizione collapse |
| **Sidebar Toggle** | Pulsante fixed, top-left, z-index 200 |
| **Config Panel** | Animazione slideDown, display:none ↔ block |
| **Radio Group** | Flex row, accent-color viola |
| **Input Text** | Sfondo elevated, border sottile, focus: bordo viola |
| **Select** | Custom arrow SVG, appearance: none |
| **File Input** | Bordo dashed, area di drop |
| **Reset Button** | Bordo rosso trasparente, hover: sfondo rosso |
| **Divider** | 1px border-top sottile |
| **DB Explorer** | Dettagli HTML5 (`<details>/<summary>`), freccia custom, hover |
| **Chat Area** | Flex column, scroll-y, gap 2px |
| **Messages** | Flex row, avatar 31px cerchio, animazione msgIn |
| **SQL Block** | Monospace, sfondo elevated, colore viola, pre-wrap |
| **Result Table** | Border-collapse, header uppercase, righe hover, bordi rounded |
| **Metric Card** | Sfondo surface, valore grande viola, label uppercase |
| **Chart Container** | Sfondo surface, toggle buttons, canvas 280px |
| **Pending Banner** | Sfondo giallo soft, titolo warning, bottoni ESEGUI/ANNULLA |
| **Status Messages** | Tre varianti: error (rosso), success (verde), info (viola) |
| **Chat Input** | Barra di input + pulsante send 42px, focus viola |
| **Send Button** | Viola trasparente, hover: viola pieno con testo nero |
| **Typing Indicator** | 3 pallini con animazione bounce sfalsata |
| **Action Buttons** | Bordo sottile, hover background, variante active viola |
| **Retry Badge** | Testo giallo su sfondo giallo trasparente |
| **Scrollbar** | Custom: 5px, track trasparente, thumb grigio |

#### Animazioni
- `slideDown`: opacity 0→1 + translateY -6→0 (pannello impostazioni)
- `msgIn`: opacity 0→1 + translateY 6→0 (messaggi chat)
- `bounce`: scale 0.5→1 con opacità (pallini typing)

#### Responsive
- Breakpoint a 768px: sidebar diventa fixed con transform translateX(-100%)
- Canvas del grafico si riduce a 220px

### 6.8 `utils/launcher.py` — Desktop App Wrapper (49 righe)

Trasforma l'applicazione web in un'app desktop nativa usando PyWebView:

1. Avvia Flask come **subprocess** in background (stdout/stderr soppressi)
2. Attende 2 secondi per l'avvio del server
3. Crea una finestra nativa 1200×800 px con PyWebView che punta a `http://localhost:5050`
4. Alla chiusura: termina il processo Flask (`SIGTERM` su macOS/Linux, `taskkill` su Windows)
5. `confirm_close=True`: chiede conferma prima di chiudere

### 6.9 Launcher Scripts

#### `Synthexa.command` (macOS/Linux)
- Rileva Python (python3 o python)
- Installa automaticamente le dipendenze se mancanti
- Libera la porta 5050 (`lsof -ti:5050 | xargs kill -9` su macOS, `fuser -k` su Linux)
- Apre automaticamente il browser dopo 2 secondi
- Stampa banner ASCII

#### `Synthexa.bat` (Windows)
- Equivalente per Windows
- Usa `netstat` + `taskkill` per liberare la porta
- Usa `start` per aprire il browser

---

## 7. Database Demo

Il progetto include `db/ecommerce.db`, un database SQLite pre-popolato. Lo schema viene letto dinamicamente a runtime, quindi l'applicazione è **database-agnostica**: funziona con qualsiasi file `.db` o `.sqlite` caricato dall'utente.

Lo schema viene estratto con:
```sql
-- Tabelle
SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';

-- Colonne per ogni tabella
PRAGMA table_info('nome_tabella');
```

---

## 8. Caratteristiche Principali (Feature List)

### 8.1 Interrogazione in Linguaggio Naturale
L'utente scrive domande in italiano. Il LLM genera automaticamente la query SQL corretta basandosi sullo schema del database.

### 8.2 Sistema di Sicurezza per le Modifiche
- Le query di tipo `INSERT`, `UPDATE`, `DELETE`, `CREATE`, `DROP`, `ALTER` **non vengono mai eseguite automaticamente**
- Viene mostrato un banner di conferma con preview dell'SQL
- L'utente deve cliccare esplicitamente "ESEGUI" per procedere
- Pulsante "ANNULLA" per annullare l'operazione

### 8.3 Auto-Correzione (Smart Retry)
Se una query SELECT genera un errore SQL:
- L'errore viene re-inviato al LLM come contesto aggiuntivo
- Fino a 3 tentativi di correzione automatica
- In caso di successo, viene mostrato un badge "Auto-Corretto"

### 8.4 Rendering Intelligente dei Risultati
- **Valore singolo** → Card metrica con formattazione automatica valuta (€) e traduzione delle funzioni SQL
- **Dati categorici (2 colonne, numerici)** → Grafico a barre interattivo (Chart.js) con toggle per la vista tabella
- **Multi-colonna** → Tabella HTML interattiva con hover sulle righe
- **Query di modifica** → Banner di conferma giallo

### 8.5 Esportazione Dati
- **CSV**: download lato client con escaping corretto
- **JSON**: download lato client con pretty-printing

### 8.6 Database Explorer
- Sidebar con visualizzazione a fisarmonica (`<details>/<summary>`) di tutte le tabelle e colonne
- Aggiornamento in tempo reale quando si cambia database

### 8.7 Upload Database
- Caricamento di file `.db` o `.sqlite` tramite drag-and-drop o file picker
- Il file viene salvato come `db/working_database.db`

### 8.8 Selezione Modello AI
- Dropdown con tutti i modelli Ollama installati
- Scelta persistente in `localStorage`

### 8.9 Cronologia Query
- Ultime 50 query salvate in `localStorage`
- Click per riprodurre una query precedente (con risultato)
- Pulsante elimina per singola voce
- Navigazione con frecce SU/GIU' nell'input

### 8.10 Reset Sessione
- Pulsante per cancellare la cronologia della chat corrente

### 8.11 Modalità Desktop
- Applicazione nativa via PyWebView (finestra 1200×800, ridimensionabile)
- Alternativa: accesso via browser a `http://localhost:5050`

### 8.12 Design Premium
- Dark mode "Tokyo Night" con palette di 12 colori
- Animazioni fluide su tutti i componenti
- Responsive: adattamento a schermi piccoli
- Scrollbar custom
- Tipografia Inter (Google Fonts)
- Nessuna dipendenza CSS esterna

---

## 9. Diagramma di Flusso — Caso d'Uso Tipico

```
UTENTE: "Qual è il totale delle vendite di giugno?"
    │
    ▼
[Frontend] Invia POST /api/query
    │  { question, history, db_path, model }
    ▼
[Backend] Legge schema database
    │  get_db_schema("db/ecommerce.db")
    │  → "ordini (id, prodotto, prezzo, data)", "clienti (...)", ...
    ▼
[Backend] Chiama Ollama
    │  generate_sql(messages, schema, "gemma4:e4b")
    │  System prompt + regole + schema + domanda
    ▼
[Ollama] Genera SQL
    │  "SELECT SUM(prezzo) FROM ordini WHERE strftime('%m', data) = '06';"
    ▼
[Backend] Classifica query
    │  first_word = "SELECT" → è una SELECT, esegui
    ▼
[Backend] Esegue su SQLite
    │  execute_sql("SELECT SUM(prezzo) FROM ordini WHERE ...", db_path)
    │  → columns: ["SUM(prezzo)"], rows: [[48250.00]]
    ▼
[Backend] Classifica risultato
    │  is_metric: true (1 colonna, 1 riga)
    │  is_chart: false
    ▼
[Backend] Restituisce JSON
    │  { type: "SELECT", sql: "...", is_metric: true, metric_label: "SUM(prezzo)", metric_value: 48250.00 }
    ▼
[Frontend] Renderizza Card Metrica
    │  formatMetricLabel("SUM(prezzo)") → "Totale Prezzo"
    │  è una keyword valuta → formatta come €
    │  → "Totale Prezzo: € 48.250,00"
    ▼
UTENTE: vede la card metrica con il risultato
```

---

## 10. Esempio — Query di Modifica

```
UTENTE: "Aggiungi il cliente Mario Rossi con email mario@example.com"
    │
    ▼
[Backend] Ollama genera:
    │  "INSERT INTO clienti (nome, email) VALUES ('Mario Rossi', 'mario@example.com');"
    │  (non include 'id' grazie alla regola 4 del prompt)
    ▼
[Backend] Classifica: first_word = "INSERT" → MODIFY
    │  NON esegue! Restituisce type: "MODIFY"
    ▼
[Frontend] Mostra Banner di Conferma
    │  ⚠ Modifica generata — Conferma esecuzione
    │  ┌──────────────────────────────────────────┐
    │  │ INSERT INTO clienti (nome, email)         │
    │  │ VALUES ('Mario Rossi', 'mario@example.com');│
    │  └──────────────────────────────────────────┘
    │  [ ESEGUI ]    [ ANNULLA ]
    │
    ├── UTENTE clicca "ESEGUI"
    │       │
    │       ▼
    │   [Frontend] Invia POST /api/execute
    │   [Backend] execute_sql() → success
    │   [Frontend] Mostra "✓ Operazione completata"
    │   [Frontend] Ricarica schema (loadSchema)
    │
    └── UTENTE clicca "ANNULLA"
            │
            ▼
        [Frontend] Mostra "Operazione annullata"
```

---

## 11. Prompt di Sistema — Ingegneria del Prompt

Il prompt di sistema inviato al LLM è il risultato di un'attenta ingegneria per massimizzare l'affidabilità:

```
Sei Synthexa AIDBMS, esperto SQL specializzato in SQLite.
SCHEMA: [tabelle e colonne del database]

REGOLE MANDATORIE:
1. Rispondi SOLO con codice SQL puro. Niente markdown, niente spiegazioni.
2. Usa nomi di tabelle e colonne ESATTAMENTE come indicati nello schema.
3. Per SQLite: usa CURRENT_DATE (senza parentesi) per la data attuale.
4. Auto-Increment: In caso di INSERT, NON specificare mai la colonna 'id'.
5. Alias: Usa alias SOLO nelle SELECT. NON usare alias in DELETE o UPDATE.
6. Separa sempre più comandi SQL con il punto e virgola ';'.
7. Per cercare nomi o testi usa LIKE invece di '='.
```

### Perché queste regole?

| Regola | Motivazione |
|--------|-------------|
| **Solo SQL puro** | Evita che il LLM aggiunga spiegazioni che romperebbero il parsing |
| **Nomi esatti** | Il LLM tende a "inventare" colonne se non vincolato |
| **CURRENT_DATE** | In SQLite la sintassi è senza parentesi — il LLM spesso sbaglia |
| **No ID in INSERT** | Evita conflitti con AUTOINCREMENT |
| **No alias in DELETE/UPDATE** | SQLite ha un parsing restrittivo degli alias |
| **LIKE per testi** | Evita problemi di case-sensitivity con `=` |

---

## 12. Sicurezza

### 12.1 Protezione da Modifiche Accidentali
- Nessuna query di scrittura viene eseguita automaticamente
- Conferma esplicita richiesta con preview SQL
- Pulsante ANNULLA sempre disponibile

### 12.2 Sanitizzazione Input
- `escapeHtml()` su tutti i dati prima del rendering HTML
- Prevenzione XSS lato client

### 12.3 Auto-Correzione Errori
- Retry automatico fino a 3 tentativi per query SELECT errate
- L'utente non vede errori SQL grezzi se il sistema può correggerli

### 12.4 Limitazioni Attuali
- **Nessuna autenticazione**: l'applicazione è progettata per uso locale single-user
- **Nessuna validazione SQL lato server**: ci si fida del LLM (potrebbe generare SQL dannoso)
- **Nessuna protezione SQL injection**: se un utente malintenzionato modifica le richieste, potrebbe eseguire SQL arbitrario

---

## 13. Limitazioni e Sfide Tecniche

### 13.1 Dipendenza da Ollama
L'applicazione **richiede** che Ollama sia installato e in esecuzione. Senza Ollama, la generazione SQL non funziona.

### 13.2 Affidabilità del LLM
Il LLM (Gemma 2) a volte genera SQL con errori. Il meccanismo di smart retry mitiga ma non risolve completamente il problema:
- Nomi di colonne inventati
- Sintassi SQL non valida
- Confusione tra dialetti SQL (MySQL vs SQLite)

### 13.3 Prestazioni
- La generazione SQL via Ollama richiede 1-5 secondi in base all'hardware
- Il modello gira interamente in locale: richiede RAM/VRAM adeguata
- Su hardware modesto (es. laptop senza GPU), i tempi possono essere elevati

### 13.4 Contesto Limitato
- Solo gli ultimi 5 messaggi vengono inviati al LLM
- Query molto complesse con contesto lungo potrebbero perdere informazioni

### 13.5 Database Support
- Solo SQLite — non supporta MySQL, PostgreSQL o altri database
- Non supporta JOIN complesse o subquery nidificate in modo affidabile

---

## 14. Possibili Sviluppi Futuri

1. **Supporto Multi-Database**: MySQL, PostgreSQL, MSSQL
2. **Autenticazione Utenti**: login multi-utente con permessi
3. **Streaming delle Risposte**: visualizzazione incrementale del testo generato
4. **Esportazione Grafici**: download dei grafici come PNG/SVG
5. **Dashboard Personalizzabili**: salvataggio di viste e grafici fissi
6. **Supporto Multilingua**: domande in inglese, francese, ecc.
7. **Storia delle Modifiche**: log delle operazioni di scrittura con possibilità di rollback
8. **Modalità Voice**: input vocale con speech-to-text
9. **Packaging**: eseguibile standalone con PyInstaller
10. **Test Automatizzati**: unit test e integration test

---

## 15. Guida all'Installazione e Avvio

### Prerequisiti
- Python 3.x installato
- [Ollama](https://ollama.com/) installato e in esecuzione
- Modello `gemma4:e4b` scaricato: `ollama pull gemma4:e4b`

### Avvio Rapido (macOS)
Doppio clic su `Synthexa.command`:
1. Rileva automaticamente Python
2. Installa le dipendenze se necessario
3. Libera la porta 5050
4. Avvia il server e apre il browser

### Avvio Manuale
```bash
cd "/percorso/synthexa"
pip install -r requirements.txt
python app.py
# Apri http://localhost:5050 nel browser
```

### Modalità Desktop
```bash
python utils/launcher.py
```

---

## 16. Riepilogo per la Presentazione

### Slide 1 — Titolo
**Synthexa AIDBMS** — Assistente AI per Database SQLite

### Slide 2 — Il Problema
- Interrogare database richiede conoscenze SQL
- Gli strumenti esistenti sono complessi per utenti non tecnici
- Le soluzioni cloud sollevano problemi di privacy

### Slide 3 — La Soluzione
- Interfaccia chat intuitiva in linguaggio naturale
- AI locale (Ollama) per generare query SQL automaticamente
- Database locale (SQLite) per privacy totale
- Funziona offline, senza API cloud

### Slide 4 — Tecnologie
Python • Flask • Waitress • Ollama • Gemma 2 • SQLite • HTML5 • CSS3 • JavaScript • Chart.js • PyWebView

### Slide 5 — Architettura
[Diagramma dell'architettura a 3 livelli: Frontend ↔ Backend Flask ↔ Ollama + SQLite]

### Slide 6 — Funzionalità Chiave
- Text-to-SQL in italiano
- Visualizzazione intelligente (metriche, grafici, tabelle)
- Sistema di conferma per modifiche
- Auto-correzione errori SQL
- Esportazione CSV/JSON
- Database Explorer
- Cronologia query
- Modalità desktop nativa

### Slide 7 — Demo
[Dimostrazione live: interrogazione del database ecommerce.db]

### Slide 8 — Sviluppi Futuri
Supporto multi-database, autenticazione, dashboard, voice input, packaging standalone

---

*Documento di presentazione del progetto*
