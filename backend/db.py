import os

import psycopg2
import psycopg2.extras

_ENV_LOADED = False


def load_env():
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            os.environ.setdefault(key, val.strip('"'))
    _ENV_LOADED = True


def get_conn():
    """Conexión con el usuario de runtime de la app (permisos limitados)."""
    load_env()
    url = os.environ["DATABASE_URL_skillmapuser"].split("?")[0]
    conn = psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)
    return conn
