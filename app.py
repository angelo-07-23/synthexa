"""
Synthexa AIDBMS — Entry point.
Avvia il server Flask con Waitress (o dev server come fallback).
"""

import sys
import os

# Assicura che src/ sia nel path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from flask import Flask
from routes import register_routes

SRC_DIR = os.path.join(os.path.dirname(__file__), 'src')
app = Flask(__name__, template_folder=os.path.join(SRC_DIR, 'templates'), static_folder=os.path.join(SRC_DIR, 'static'))
register_routes(app)

if __name__ == '__main__':
    print("=" * 50)
    print("  Synthexa AIDBMS")
    print("  http://localhost:5050")
    print("=" * 50)

    try:
        from waitress import serve
        serve(app, host='0.0.0.0', port=5050)
    except ImportError:
        import logging
        log = logging.getLogger('werkzeug')
        log.setLevel(logging.ERROR)
        app.run(host='0.0.0.0', port=5050, debug=False)
