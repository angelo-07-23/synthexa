// =============================================
//  Synthexa AIDBMS - Frontend Logic
// =============================================

const state = {
    dbPath: 'db/ecommerce.db',
    provider: 'ollama',
    lmstudioUrl: 'http://localhost:1234/v1',
    model: '',
    messages: [],
    pendingSql: null,
    schema: null
};

// --- DOM Elements ---
const chatArea = document.getElementById('chatArea');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const settingsBtn = document.getElementById('settingsBtn');
const configPanel = document.getElementById('configPanel');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebar = document.getElementById('sidebar');
const dbPathInput = document.getElementById('dbPath');
const dbFileInput = document.getElementById('dbFile');
const dbStatus = document.getElementById('dbStatus');
const resetBtn = document.getElementById('resetBtn');
const schemaContainer = document.getElementById('schemaContainer');
const historyContainer = document.getElementById('historyContainer');
const welcomeMsg = document.getElementById('welcomeMsg');
const localPanel = document.getElementById('localPanel');
const uploadPanel = document.getElementById('uploadPanel');
const modelSelect = document.getElementById('modelSelect');
const lmstudioPanel = document.getElementById('lmstudioPanel');
const lmstudioUrlInput = document.getElementById('lmstudioUrl');

// --- SIDEBAR TOGGLE ---
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
});

// --- SETTINGS TOGGLE ---
settingsBtn.addEventListener('click', () => {
    configPanel.classList.toggle('active');
});

// --- RADIO: AI Provider ---
document.querySelectorAll('input[name="aiProvider"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        state.provider = e.target.value;
        localStorage.setItem('synthexa_provider', state.provider);
        if (state.provider === 'lmstudio') {
            lmstudioPanel.style.display = 'block';
        } else {
            lmstudioPanel.style.display = 'none';
        }
        loadModels();
    });
});

// --- LM STUDIO URL ---
let lmstudioUrlTimeout;
lmstudioUrlInput.addEventListener('input', () => {
    clearTimeout(lmstudioUrlTimeout);
    lmstudioUrlTimeout = setTimeout(() => {
        state.lmstudioUrl = lmstudioUrlInput.value.trim();
        localStorage.setItem('synthexa_lmstudio_url', state.lmstudioUrl);
        if (state.provider === 'lmstudio') {
            loadModels();
        }
    }, 500);
});
// --- RADIO: Locale / Upload ---
document.querySelectorAll('input[name="connMode"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'locale') {
            localPanel.style.display = 'block';
            uploadPanel.style.display = 'none';
        } else {
            localPanel.style.display = 'none';
            uploadPanel.style.display = 'block';
        }
    });
});

// --- DB PATH CHANGE ---
let dbPathTimeout;
dbPathInput.addEventListener('input', () => {
    clearTimeout(dbPathTimeout);
    dbPathTimeout = setTimeout(() => {
        state.dbPath = dbPathInput.value.trim();
        loadSchema();
    }, 500);
});

// --- DB FILE UPLOAD ---
dbFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
            state.dbPath = data.db_path;
            dbPathInput.value = data.db_path;
            dbStatus.innerHTML = '<span style="color:#34d399">✓ Database caricato</span>';
            loadSchema();
        } else {
            dbStatus.innerHTML = `<span style="color:#f87171">✗ ${data.error}</span>`;
        }
    } catch (err) {
        dbStatus.innerHTML = `<span style="color:#f87171">✗ Errore upload</span>`;
    }
});

// --- MODEL SELECT ---
modelSelect.addEventListener('change', () => {
    state.model = modelSelect.value;
    localStorage.setItem('synthexa_model', state.model);
});

async function loadModels() {
    try {
        const params = new URLSearchParams({ provider: state.provider });
        if (state.provider === 'lmstudio') {
            params.set('lmstudio_url', state.lmstudioUrl);
        }
        const res = await fetch(`/api/models?${params.toString()}`);
        const data = await res.json();
        if (data.models && data.models.length > 0) {
            modelSelect.innerHTML = data.models.map(m => {
                const name = typeof m === 'string' ? m : (m.name || m.id || m.model || String(m));
                return `<option value="${name}">${name}</option>`;
            }).join('');
            const saved = localStorage.getItem('synthexa_model');
            if (saved && data.models.includes(saved)) {
                state.model = saved;
                modelSelect.value = saved;
            } else if (typeof data.models[0] === 'string') {
                state.model = data.models[0];
                modelSelect.value = data.models[0];
            } else {
                const firstName = data.models[0].name || data.models[0].id || data.models[0].model || String(data.models[0]);
                state.model = firstName;
                modelSelect.value = firstName;
            }
        } else {
            modelSelect.innerHTML = '<option value="">Nessun modello trovato</option>';
        }
    } catch {
        modelSelect.innerHTML = '<option value="">Errore caricamento</option>';
    }
}

// --- RESET ---
resetBtn.addEventListener('click', () => {
    state.messages = [];
    state.pendingSql = null;
    chatArea.innerHTML = '';
    welcomeMsg.style.display = 'flex';
    chatArea.appendChild(welcomeMsg);
});

// --- LOAD SCHEMA ---
async function loadSchema() {
    try {
        const res = await fetch(`/api/schema?db_path=${encodeURIComponent(state.dbPath)}`);
        const data = await res.json();
        if (data.error) {
            schemaContainer.innerHTML = `<div class="warning-msg">${data.error}</div>`;
            dbStatus.innerHTML = `<span style="color:#f87171">✗ File non trovato</span>`;
            state.schema = null;
            return;
        }
        state.schema = data.schema;
        dbStatus.innerHTML = '<span style="color:#34d399">✓ Connesso</span>';
        renderSchema(data.schema);
    } catch (err) {
        schemaContainer.innerHTML = `<div class="warning-msg">Errore connessione server</div>`;
    }
}

function renderSchema(schema) {
    let html = '';
    for (const [table, cols] of Object.entries(schema)) {
        html += `<details>
            <summary>${table}</summary>
            <div class="columns">
                ${cols.map(c => `<div class="col-name">- ${c}</div>`).join('')}
            </div>
        </details>`;
    }
    schemaContainer.innerHTML = html || '<div class="warning-msg">Nessuna tabella trovata</div>';
}

// --- RENDER MESSAGE ---
function addMessage(role, content, metadata = {}) {
    if (welcomeMsg.parentNode === chatArea) {
        chatArea.removeChild(welcomeMsg);
    }

    const div = document.createElement('div');
    div.className = `message ${role}`;

    const avatarClass = role === 'user' ? 'user-avatar' : 'bot-avatar';
    const avatarText = role === 'user' ? '👤' : '🤖';

    let retryBadge = metadata.wasRetried ? '<span class="retry-badge">Auto-Corretto</span>' : '';

    div.innerHTML = `
        <div class="avatar ${avatarClass}">${avatarText}</div>
        <div class="message-content">
            ${content}
            ${role === 'assistant' ? retryBadge : ''}
        </div>
    `;

    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
    return div;
}

function addTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'typing-indicator';
    div.id = 'typingIndicator';
    div.innerHTML = `
        <div class="avatar bot-avatar">🤖</div>
        <div class="typing-dots"><span></span><span></span><span></span></div>
    `;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
}

function removeTypingIndicator() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
}

// --- TABLE RENDERING ---
function renderTable(columns, rows) {
    if (!rows || rows.length === 0) return '<div class="info-msg">Nessun risultato</div>';

    const tableId = 'table_' + Math.random().toString(36).substr(2, 9);
    window[tableId] = { columns, rows };

    let html = '<div class="table-container">';
    html += '<table class="result-table"><thead><tr>';
    columns.forEach(c => html += `<th>${c}</th>`);
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
        html += '<tr>';
        row.forEach(val => html += `<td>${val !== null ? val : 'NULL'}</td>`);
        html += '</tr>';
    });
    html += '</tbody></table>';

    html += `
        <div class="action-buttons">
            <button class="btn-action" onclick="exportToCSV('${tableId}')">
                📄 Esporta CSV
            </button>
            <button class="btn-action" onclick="exportToJSON('${tableId}')">
                📦 Esporta JSON
            </button>
        </div>
    `;
    html += '</div>';

    return html;
}

// --- METRIC RENDERING ---
function formatMetricLabel(raw) {
    const cleaned = raw.replace(/_/g, ' ').trim();

    const aggMap = {
        'SUM': 'Totale',
        'COUNT': 'Conteggio',
        'AVG': 'Media',
        'MAX': 'Massimo',
        'MIN': 'Minimo',
        'TOTAL': 'Totale',
        'GROUP_CONCAT': 'Elenco'
    };

    for (const [fn, it] of Object.entries(aggMap)) {
        const match = cleaned.match(new RegExp(`^${fn}\\s*\\((.+)\\)$`, 'i'));
        if (match) {
            let inner = match[1].trim();
            if (fn === 'COUNT' && inner === '*') return 'Conteggio';
            inner = inner.replace(/\*/g, ' × ');
            inner = inner.replace(/\//g, ' ÷ ');
            inner = inner.replace(/\+/g, ' + ');
            inner = inner.replace(/\-/g, ' − ');
            return `${it} ${inner}`;
        }
    }

    return cleaned.replace(/\b\w/g, c => c.toUpperCase());
}

function renderMetric(label, value) {
    const formattedLabel = formatMetricLabel(label);
    let displayValue = value;

    const moneyKeywords = ['prezzo', 'totale', 'fatturato', 'sum', 'somma', 'importo', 'ricavo'];
    if (typeof value === 'number' && moneyKeywords.some(k => label.toLowerCase().includes(k))) {
        displayValue = '€ ' + value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    return `<div class="metric-card">
        <div class="metric-label">${formattedLabel}</div>
        <div class="metric-value">${displayValue}</div>
    </div>`;
}

// --- CHART RENDERING ---
const chartInstances = {};

function renderChart(columns, rows) {
    const chartId = 'chart_' + Math.random().toString(36).substr(2, 9);

    const labels = rows.map(r => String(r[0] !== null ? r[0] : 'NULL'));
    const values = rows.map(r => parseFloat(r[1]) || 0);

    window[chartId] = { columns, rows, labels, values };

    const html = `<div class="chart-container" id="${chartId}">
        <div class="chart-toggle-row">
            <button class="btn-chart-toggle active" onclick="switchChartView('${chartId}', 'chart')" id="${chartId}_btn_chart">📊 Grafico</button>
            <button class="btn-chart-toggle" onclick="switchChartView('${chartId}', 'table')" id="${chartId}_btn_table">📋 Tabella</button>
        </div>
        <div class="chart-canvas-wrapper" id="${chartId}_chart">
            <canvas id="${chartId}_canvas"></canvas>
        </div>
        <div class="chart-table-wrapper" id="${chartId}_table" style="display:none;"></div>
    </div>`;

    return { html, chartId };
}

function initChart(chartId) {
    const data = window[chartId];
    const canvas = document.getElementById(chartId + '_canvas');
    if (!data || !canvas) {
        console.warn('initChart: canvas o dati non trovati per', chartId);
        return;
    }

    if (typeof Chart === 'undefined') {
        console.error('Chart.js non caricato');
        return;
    }

    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
    }

    try {
        chartInstances[chartId] = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: data.columns[1].replace(/_/g, ' '),
                    data: data.values,
                    backgroundColor: '#a78bfa',
                    borderColor: 'rgba(167, 139, 250, 0.4)',
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#18181b',
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 1,
                        titleColor: '#e4e4e7',
                        bodyColor: '#e4e4e7'
                    }
                },
                scales: {
                    x: {
                        ticks: { color: '#71717a', maxRotation: 45, font: { size: 11 } },
                        grid: { color: 'rgba(255,255,255,0.04)' }
                    },
                    y: {
                        ticks: { color: '#71717a', font: { size: 11 } },
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (err) {
        console.error('initChart: errore Chart.js', err);
    }
}

function switchChartView(chartId, view) {
    const chartWrapper = document.getElementById(chartId + '_chart');
    const tableWrapper = document.getElementById(chartId + '_table');
    const btnChart = document.getElementById(chartId + '_btn_chart');
    const btnTable = document.getElementById(chartId + '_btn_table');

    if (view === 'chart') {
        chartWrapper.style.display = 'block';
        tableWrapper.style.display = 'none';
        btnChart.classList.add('active');
        btnTable.classList.remove('active');
        if (chartInstances[chartId]) chartInstances[chartId].resize();
    } else {
        chartWrapper.style.display = 'none';
        tableWrapper.style.display = 'block';
        btnChart.classList.remove('active');
        btnTable.classList.add('active');
        if (!tableWrapper.innerHTML) {
            const data = window[chartId];
            let html = '<table class="result-table"><thead><tr>';
            data.columns.forEach(c => html += `<th>${c}</th>`);
            html += '</tr></thead><tbody>';
            data.rows.forEach(row => {
                html += '<tr>';
                row.forEach(val => html += `<td>${val !== null ? val : 'NULL'}</td>`);
                html += '</tr>';
            });
            html += '</tbody></table>';
            tableWrapper.innerHTML = html;
        }
    }
}

// --- QUERY HISTORY (localStorage) ---
const HISTORY_KEY = 'synthexa_query_history';
const MAX_HISTORY = 50;
let historyIndex = -1;

function getQueryHistory() {
    try {
        const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        if (raw.length > 0 && typeof raw[0] === 'string') {
            localStorage.setItem(HISTORY_KEY, '[]');
            return [];
        }
        return raw;
    }
    catch { return []; }
}

function saveQueryHistory(question, responseData) {
    let history = getQueryHistory();
    if (history.length > 0 && history[0].question === question) return;
    history.unshift({ question, responseData });
    if (history.length > MAX_HISTORY) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const history = getQueryHistory();
    if (history.length === 0) {
        historyContainer.innerHTML = '<div class="info-msg-sidebar">Nessuna query recente</div>';
        return;
    }
    let html = '';
    history.forEach((entry, i) => {
        html += `<div class="history-item" onclick="useHistoryQuery(${i})" title="${escapeHtml(entry.question)}">
            <span class="history-item-text">${escapeHtml(entry.question)}</span>
            <button class="history-delete-btn" onclick="event.stopPropagation(); deleteHistoryItem(${i})" title="Rimuovi">🗑</button>
        </div>`;
    });
    historyContainer.innerHTML = html;
}

function deleteHistoryItem(index) {
    let history = getQueryHistory();
    history.splice(index, 1);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
}

function useHistoryQuery(index) {
    const history = getQueryHistory();
    const entry = history[index];
    if (!entry || !entry.responseData) return;

    const data = entry.responseData;
    addMessage('user', `<p>${escapeHtml(entry.question)}</p>`);

    if (data.type === 'SELECT') {
        let resultHtml = '';
        let pendingChartId = null;

        if (data.is_metric) {
            resultHtml += renderMetric(data.metric_label, data.metric_value);
        } else if (data.is_chart) {
            const chart = renderChart(data.columns, data.rows);
            resultHtml += chart.html;
            pendingChartId = chart.chartId;
        } else {
            resultHtml += renderTable(data.columns, data.rows);
        }

        addMessage('assistant', resultHtml, { wasRetried: data.was_retried });

        if (pendingChartId) {
            initChart(pendingChartId);
        }
    } else if (data.type === 'MODIFY') {
        addMessage('assistant', `<div class="info-msg">Query di modifica (non più eseguibile dalla cronologia)</div>`);
    } else if (data.type === 'ERROR' || data.type === 'AI_ERROR') {
        addMessage('assistant', `<div class="error-msg">${escapeHtml(data.error || data.sql)}</div>`);
    }
}

// --- PENDING SQL BANNER ---
function showPendingBanner(sql) {
    state.pendingSql = sql;
    const content = `
        <div class="pending-banner">
            <div class="pending-title">⚠ Modifica generata — Conferma esecuzione</div>
            <div class="sql-block">${escapeHtml(sql)}</div>
            <div class="pending-actions">
                <button class="btn-exec" onclick="executePending()">ESEGUI</button>
                <button class="btn-cancel" onclick="cancelPending()">ANNULLA</button>
            </div>
        </div>
    `;
    addMessage('assistant', content);
}

async function executePending() {
    if (!state.pendingSql) return;
    try {
        const res = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: state.pendingSql, db_path: state.dbPath })
        });
        const data = await res.json();
        if (data.error) {
            addMessage('assistant', `<div class="error-msg">${escapeHtml(data.error)}</div>`);
        } else {
            addMessage('assistant', `<div class="success-msg">✓ Operazione completata</div>`);
            loadSchema();
        }
    } catch (err) {
        addMessage('assistant', `<div class="error-msg">Errore di connessione</div>`);
    }
    state.pendingSql = null;
}

function cancelPending() {
    state.pendingSql = null;
    addMessage('assistant', `<div class="info-msg">Operazione annullata</div>`);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// --- SEND MESSAGE ---
async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    if (!state.dbPath) {
        addMessage('assistant', '<div class="warning-msg">Configura un database nelle impostazioni</div>');
        return;
    }

    chatInput.value = '';
    sendBtn.disabled = true;
    addMessage('user', `<p>${escapeHtml(text)}</p>`);
    addTypingIndicator();

    try {
        const res = await fetch('/api/query', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: text,
                history: state.messages,
                db_path: state.dbPath,
                model: state.model,
                provider: state.provider,
                lmstudio_url: state.lmstudioUrl
            })
        });
        const data = await res.json();
        removeTypingIndicator();

        if (data.error) {
            addMessage('assistant', `<div class="error-msg">${escapeHtml(data.error)}</div>`);
        } else if (data.type === 'SELECT') {
            let resultHtml = '';
            let pendingChartId = null;

            if (data.is_metric) {
                resultHtml += renderMetric(data.metric_label, data.metric_value);
            } else if (data.is_chart) {
                const chart = renderChart(data.columns, data.rows);
                resultHtml += chart.html;
                pendingChartId = chart.chartId;
            } else {
                resultHtml += renderTable(data.columns, data.rows);
            }

            addMessage('assistant', resultHtml, { wasRetried: data.was_retried });
            saveQueryHistory(text, data);

            if (pendingChartId) {
                initChart(pendingChartId);
            }

            state.messages.push({ role: 'user', content: text });
            state.messages.push({ role: 'assistant', content: data.sql });
            if (state.messages.length > 10) state.messages.splice(0, 2);

        } else if (data.type === 'MODIFY') {
            showPendingBanner(data.sql);
            state.messages.push({ role: 'user', content: text });
            state.messages.push({ role: 'assistant', content: data.sql });
        } else if (data.type === 'AI_ERROR') {
            addMessage('assistant', `<div class="error-msg">${escapeHtml(data.sql)}</div>`);
        }
    } catch (err) {
        removeTypingIndicator();
        addMessage('assistant', `<div class="error-msg">Errore di connessione al server</div>`);
    }

    sendBtn.disabled = false;
    chatInput.focus();
}

// --- UTILITIES ---
function copyToClipboard(btn, text) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Copiato!';
        btn.classList.add('active');
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('active');
        }, 2000);
    });
}

function exportToCSV(tableId) {
    const { columns, rows } = window[tableId];
    const csvContent = [
        columns.join(','),
        ...rows.map(r => r.map(val => {
            if (val === null) return '';
            const str = String(val).replace(/"/g, '""');
            return `"${str}"`;
        }).join(','))
    ].join('\n');
    downloadFile(csvContent, 'synthexa_export.csv', 'text/csv');
}

function exportToJSON(tableId) {
    const { columns, rows } = window[tableId];
    const data = rows.map(row => {
        const obj = {};
        columns.forEach((col, i) => obj[col] = row[i]);
        return obj;
    });
    downloadFile(JSON.stringify(data, null, 2), 'synthexa_export.json', 'application/json');
}

function downloadFile(content, fileName, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
}

// --- EVENT LISTENERS ---
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        const history = getQueryHistory();
        if (history.length === 0) return;
        if (historyIndex === -1) {
            chatInput.dataset.savedInput = chatInput.value;
            historyIndex = 0;
        } else {
            historyIndex = Math.min(historyIndex + 1, history.length - 1);
        }
        chatInput.value = history[historyIndex]?.question || '';
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const history = getQueryHistory();
        if (historyIndex <= 0) {
            chatInput.value = chatInput.dataset.savedInput || '';
            historyIndex = -1;
            delete chatInput.dataset.savedInput;
        } else {
            historyIndex--;
            chatInput.value = history[historyIndex]?.question || '';
        }
    } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        historyIndex = -1;
        sendMessage();
    } else {
        historyIndex = -1;
    }
});

// --- INIT ---
const savedProvider = localStorage.getItem('synthexa_provider');
if (savedProvider) {
    state.provider = savedProvider;
    const radio = document.querySelector(`input[name="aiProvider"][value="${savedProvider}"]`);
    if (radio) {
        radio.checked = true;
        if (savedProvider === 'lmstudio') {
            lmstudioPanel.style.display = 'block';
        }
    }
}
const savedLmstudioUrl = localStorage.getItem('synthexa_lmstudio_url');
if (savedLmstudioUrl) {
    state.lmstudioUrl = savedLmstudioUrl;
    lmstudioUrlInput.value = savedLmstudioUrl;
}
loadModels();
loadSchema();
renderHistory();
