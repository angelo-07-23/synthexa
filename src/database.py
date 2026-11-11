"""
Synthexa AIDBMS — Database helpers.
Operazioni di lettura schema ed esecuzione query SQLite.
"""

import sqlite3
import re
from typing import Tuple, Dict, Optional


def get_db_schema(db_path: str) -> Tuple[Dict[str, list], str]:
    """Recupera lo schema del database (tabelle e colonne)."""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = cursor.fetchall()
        schema_info = {}
        schema_text = ""
        for table in tables:
            t_name = table[0]
            cursor.execute(f"PRAGMA table_info('{t_name}');")
            cols = [col[1] for col in cursor.fetchall()]
            schema_info[t_name] = cols
            schema_text += f"- {t_name} ({', '.join(cols)})\n"
        conn.close()
        return schema_info, schema_text
    except Exception:
        return {}, ""


def is_chart_eligible(columns, rows):
    """Restituisce True se i risultati sono adatti a un grafico (2 colonne, seconda numerica, almeno 2 righe)."""
    if not columns or len(columns) != 2 or not rows or len(rows) < 2:
        return False
    for row in rows:
        val = row[1]
        if val is None:
            continue
        try:
            float(val)
        except (ValueError, TypeError):
            return False
    return True


def execute_sql(query: str, db_path: str) -> Tuple[Optional[list], Optional[list], Optional[str], str]:
    """Esegue una query SQL sul database fornito.
    Gestisce sia singole query che script con più istruzioni.
    Restituisce (columns, rows, error, query_type).
    """
    try:
        conn = sqlite3.connect(db_path)
        clean_query = re.sub(r'--.*', '', query).strip()
        if not clean_query:
            return None, None, "Query vuota", "ERROR"

        first_word = clean_query.split()[0].upper()

        if first_word == "SELECT":
            first_stmt = clean_query.split(';')[0].strip()
            cursor = conn.cursor()
            cursor.execute(first_stmt)
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            conn.close()
            return columns, rows, None, "SELECT"
        else:
            conn.executescript(query)
            conn.close()
            return None, None, None, "SCRIPT"
    except Exception as e:
        return None, None, str(e), "ERROR"
