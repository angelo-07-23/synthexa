"""
Synthexa AIDBMS — LLM integration.
Generazione SQL tramite Ollama o LM Studio.
"""

import ollama  # pyrefly: ignore [missing-import]
from openai import OpenAI


def _build_system_prompt(schema_text: str) -> str:
    return f"""
    Sei Synthexa AIDBMS, esperto SQL specializzato ESCLUSIVAMENTE in SQLite.
    SCHEMA: {schema_text}

    REGOLE MANDATORIE:
    1. Rispondi SOLO con codice SQL puro. Niente markdown, niente spiegazioni, niente testo prima o dopo la query.
    2. Usa nomi di tabelle e colonne ESATTAMENTE come indicati nello schema.
    3. SQLite NON supporta: RETURN, RETURNING, window functions complesse, FULL OUTER JOIN. Usa solo sintassi SQLite.
    4. Auto-Increment: In caso di INSERT, NON specificare mai la colonna 'id'. Lascia che SQLite la gestisca.
    5. Alias: Puoi usare alias brevi (es. p, o, d) nelle JOIN. Ogni colonna va sempre qualificata con l'alias o il nome tabella (es. p.nome, d.quantita).
    6. Per la data attuale usa CURRENT_DATE.
    7. Separa più comandi SQL con il punto e virgola ';'.
    8. Per cercare nomi/testi usa LIKE invece di '='.
    9. Per GROUP BY, includi tutte le colonne non aggregate nella SELECT.
    """


def _strip_content(content: str) -> str:
    return content.strip().replace("```sql", "").replace("```", "").strip()


def _generate_sql_ollama(messages: list, schema_text: str, model: str) -> str:
    system_prompt = _build_system_prompt(schema_text)
    ollama_messages = [{'role': 'system', 'content': system_prompt}]
    ollama_messages.extend(messages[-5:])

    response = ollama.chat(model=model, messages=ollama_messages)
    if hasattr(response, 'message'):
        content = response.message.content
    else:
        content = response['message']['content']
    return _strip_content(content)


def _normalize_lmstudio_url(base_url: str) -> str:
    url = base_url.rstrip('/')
    if not url.endswith('/v1'):
        url += '/v1'
    return url


def _generate_sql_lmstudio(messages: list, schema_text: str, model: str, base_url: str) -> str:
    client = OpenAI(base_url=_normalize_lmstudio_url(base_url), api_key="lm-studio")
    system_prompt = _build_system_prompt(schema_text)

    api_messages = [{'role': 'system', 'content': system_prompt}]
    for m in messages[-5:]:
        api_messages.append({'role': m['role'], 'content': m['content']})

    response = client.chat.completions.create(
        model=model,
        messages=api_messages,
        temperature=0.1,
    )
    content = response.choices[0].message.content
    return _strip_content(content)


def generate_sql(messages: list, schema_text: str, model: str = 'gemma4:e4b',
                 provider: str = 'ollama', lmstudio_url: str = 'http://localhost:1234/v1') -> str:
    """Genera una query SQL a partire dalla cronologia della chat."""
    try:
        if provider == 'lmstudio':
            return _generate_sql_lmstudio(messages, schema_text, model, lmstudio_url)
        else:
            return _generate_sql_ollama(messages, schema_text, model)
    except Exception as e:
        return f"-- Errore {provider}: {str(e)}"


def _list_models_ollama():
    result = ollama.list()
    if hasattr(result, 'models'):
        return [m.model for m in result.models]
    else:
        return [m['name'] for m in result.get('models', [])]


def _list_models_lmstudio(base_url: str):
    client = OpenAI(base_url=_normalize_lmstudio_url(base_url), api_key="lm-studio")
    models = client.models.list()
    return [m.id for m in models.data]


def list_models(provider: str = 'ollama', lmstudio_url: str = 'http://localhost:1234/v1'):
    """Restituisce la lista dei modelli disponibili."""
    try:
        if provider == 'lmstudio':
            return _list_models_lmstudio(lmstudio_url)
        else:
            return _list_models_ollama()
    except Exception:
        return []
