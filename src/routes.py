"""
Synthexa AIDBMS — API Routes.
Definizione di tutti gli endpoint REST.
"""

import os
import re
from flask import render_template, request, jsonify

from database import get_db_schema, execute_sql, is_chart_eligible
from llm import generate_sql, list_models


def register_routes(app):

    @app.route('/')
    def index():
        """Serve la pagina principale."""
        return render_template('index.html')

    @app.route('/api/schema', methods=['GET'])
    def api_schema():
        """Restituisce lo schema del database."""
        db_path = request.args.get('db_path', 'db/ecommerce.db')
        if not os.path.exists(db_path):
            return jsonify({'error': 'File non trovato', 'schema': {}})
        schema_info, _ = get_db_schema(db_path)
        return jsonify({'schema': schema_info, 'error': None})

    @app.route('/api/query', methods=['POST'])
    def api_query():
        """Riceve una domanda, genera SQL con AI, esegue e restituisce i risultati."""
        data = request.get_json()
        question = data.get('question', '')
        history = data.get('history', [])
        db_path = data.get('db_path', 'db/ecommerce.db')
        model = data.get('model', 'gemma4:e4b')
        provider = data.get('provider', 'ollama')
        lmstudio_url = data.get('lmstudio_url', 'http://localhost:1234/v1')

        if not os.path.exists(db_path):
            return jsonify({'error': 'Database non trovato', 'type': 'ERROR'})

        _, schema_text = get_db_schema(db_path)
        messages = history + [{'role': 'user', 'content': question}]
        sql = generate_sql(messages, schema_text, model, provider=provider, lmstudio_url=lmstudio_url)

        if sql.startswith('-- Errore'):
            return jsonify({'type': 'AI_ERROR', 'sql': sql, 'error': sql})

        # MODIFY: non eseguire, restituisci subito per conferma
        clean_sql = re.sub(r'--.*', '', sql).strip()
        # Cerca la prima keyword SQL ignorando eventuale testo introduttivo del LLM
        match = re.search(r'\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b', clean_sql, re.IGNORECASE)
        first_word = match.group(1).upper() if match else ''
        if first_word in ('INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'):
            return jsonify({'type': 'MODIFY', 'sql': sql, 'error': None})

        # Tenta esecuzione (solo SELECT)
        columns, rows, err, qtype = execute_sql(sql, db_path)

        # Smart retry (fino a 3 tentativi)
        max_retries = 3
        retry_count = 0
        while err and retry_count < max_retries:
            retry_count += 1
            retry_prompt = f"""
            La query SQL precedente ha generato un errore: {err}
            Query errata: {sql}

            Per favore, correggi la query SQL mantenendo l'intento originale dell'utente: {question}
            Rispondi SOLO con la query SQL corretta.
            """
            retry_messages = messages + [
                {'role': 'assistant', 'content': sql},
                {'role': 'user', 'content': retry_prompt}
            ]
            sql = generate_sql(retry_messages, schema_text, model, provider=provider, lmstudio_url=lmstudio_url)

            if sql.startswith('-- Errore'):
                break

            # Intercetta eventuali MODIFY generate per errore dall'LLM durante il retry
            clean_r = re.sub(r'--.*', '', sql).strip()
            match_r = re.search(r'\b(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\b', clean_r, re.IGNORECASE)
            first_r = match_r.group(1).upper() if match_r else ''
            if first_r in ('INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'):
                return jsonify({'type': 'MODIFY', 'sql': sql, 'error': None})

            columns, rows, err, qtype = execute_sql(sql, db_path)

            if not err:
                is_metric_result = columns and rows and len(columns) == 1 and len(rows) == 1
                return jsonify({
                    'type': 'SELECT',
                    'sql': sql,
                    'columns': columns,
                    'rows': rows,
                    'is_metric': is_metric_result,
                    'is_chart': not is_metric_result and is_chart_eligible(columns, rows),
                    'metric_label': columns[0] if columns else '',
                    'metric_value': rows[0][0] if rows else None,
                    'error': None,
                    'was_retried': True
                })

        if err:
            return jsonify({'type': 'ERROR', 'error': err, 'sql': sql})

        if qtype == 'SELECT':
            is_metric = columns and rows and len(columns) == 1 and len(rows) == 1
            return jsonify({
                'type': 'SELECT',
                'sql': sql,
                'columns': columns,
                'rows': rows,
                'is_metric': is_metric,
                'is_chart': not is_metric and is_chart_eligible(columns, rows),
                'metric_label': columns[0] if is_metric else '',
                'metric_value': rows[0][0] if is_metric else None,
                'error': None
            })

        return jsonify({'type': 'MODIFY', 'sql': sql, 'error': None})

    @app.route('/api/execute', methods=['POST'])
    def api_execute():
        """Esegue direttamente una query SQL (dopo conferma dell'utente)."""
        data = request.get_json()
        sql = data.get('sql', '')
        db_path = data.get('db_path', 'db/ecommerce.db')

        if not os.path.exists(db_path):
            return jsonify({'error': 'Database non trovato'})

        _, _, err, _ = execute_sql(sql, db_path)
        if err:
            return jsonify({'error': err})
        return jsonify({'success': True, 'error': None})

    @app.route('/api/upload', methods=['POST'])
    def api_upload():
        """Carica un file database."""
        if 'file' not in request.files:
            return jsonify({'error': 'Nessun file ricevuto', 'success': False})

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Nome file vuoto', 'success': False})

        working_path = 'db/working_database.db'
        os.makedirs('db', exist_ok=True)
        file.save(working_path)
        return jsonify({'success': True, 'db_path': working_path, 'error': None})

    @app.route('/api/models', methods=['GET'])
    def api_models():
        """Restituisce la lista dei modelli disponibili."""
        provider = request.args.get('provider', 'ollama')
        lmstudio_url = request.args.get('lmstudio_url', 'http://localhost:1234/v1')
        models = list_models(provider=provider, lmstudio_url=lmstudio_url)
        return jsonify({'models': models, 'error': None})
