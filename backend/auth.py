import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from db import load_env

load_env()
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
TOKEN_TTL_HOURS = 24 * 7
GOOGLE_CLIENT_ID = os.environ["GOOGLE_CLIENT_ID"]
ALLOWED_DOMAIN = "dhnn.com"

bearer_scheme = HTTPBearer(auto_error=False)
_google_request = google_requests.Request()


def verify_google_credential(credential: str) -> str:
    """Valida el ID token de Google (firma + audiencia + dominio) y devuelve el email."""
    try:
        payload = google_id_token.verify_oauth2_token(credential, _google_request, GOOGLE_CLIENT_ID)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token de Google inválido")
    if payload.get("hd") != ALLOWED_DOMAIN and not payload.get("email", "").endswith(f"@{ALLOWED_DOMAIN}"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, f"Solo se permite login con cuentas @{ALLOWED_DOMAIN}")
    if not payload.get("email_verified"):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email de Google no verificado")
    return payload["email"].lower()


def hash_password(raw: str) -> str:
    return bcrypt.hashpw(raw.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(raw: str, hashed: str) -> bool:
    return bcrypt.checkpw(raw.encode("utf-8")[:72], hashed.encode("utf-8"))


def create_token(person: dict) -> str:
    payload = {
        "sub": str(person["id"]),  # PyJWT exige que "sub" sea string
        "email": person["email"],
        "nombre": person["nombre"],
        "es_lider": person["banda"] in ("Management", "Lead"),
        "es_admin": person["es_admin"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        payload["sub"] = int(payload["sub"])  # de vuelta a int para el resto de la app
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión expirada, volvé a iniciar sesión")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido")


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Falta iniciar sesión")
    return decode_token(creds.credentials)


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if not user.get("es_admin"):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Requiere rol admin (People)")
    return user
