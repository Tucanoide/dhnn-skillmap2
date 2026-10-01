"""Armado de equipos con IA: dado un brief de proyecto y el roster con sus
habilidades, le pide a Claude que arme una propuesta de equipo usando
solamente personas que existen en el roster (referenciadas por person_id)."""

import json
import os

import anthropic

from db import load_env

load_env()

MODEL = os.getenv("ANTHROPIC_MODEL", "claude-opus-5").strip()
WORKSPACE_ID = os.getenv("ANTHROPIC_WORKSPACE_ID", "").strip()

_client = None


def get_client():
    global _client
    if _client is None:
        client_options = {"api_key": os.environ["ANTHROPIC_API_KEY"]}
        if WORKSPACE_ID:
            client_options["default_headers"] = {"anthropic-workspace-id": WORKSPACE_ID}
        _client = anthropic.Anthropic(**client_options)
    return _client


TEAM_SCHEMA = {
    "type": "object",
    "properties": {
        "resumen": {
            "type": "string",
            "description": "Resumen de 1-2 frases del criterio usado para armar el equipo.",
        },
        "equipo": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "person_id": {"type": "integer"},
                    "nombre": {"type": "string"},
                    "tipo": {"type": "string", "enum": ["interno", "freelance"]},
                    "rol_en_equipo": {"type": "string"},
                    "justificacion": {"type": "string"},
                },
                "required": ["person_id", "nombre", "tipo", "rol_en_equipo", "justificacion"],
                "additionalProperties": False,
            },
        },
        "gaps": {
            "type": "string",
            "description": "Habilidades que pide el brief y el roster no cubre bien. Vacío si no hay gaps.",
        },
    },
    "required": ["resumen", "equipo", "gaps"],
    "additionalProperties": False,
}

SYSTEM_PROMPT = """Sos un asistente que arma equipos de proyecto para la agencia DHNN a partir de:
1. El pool completo de personas disponibles — tanto el equipo interno de DHNN como partners/freelancers del
   "Ecosistema de partners" (campo "tipo": "interno" o "freelance") — con sus habilidades y el nivel actual
   en cada una (escala 0 a 5, 0 = sin autoevaluar, 5 = maestro). Cuando una habilidad fue validada (campo
   "validado") es más confiable que una autoevaluación o una estimación por CV sin validar.
2. Un brief de proyecto en texto libre, escrito por un administrador.

Elegí las personas del pool (usando exactamente su person_id, nunca inventes personas que no estén en la
lista) que mejor cubran lo que pide el brief, priorizando nivel_actual alto en las skills relevantes y, a
igual nivel, las validadas. Combiná libremente gente interna y freelance según lo que más convenga al
proyecto — no hay preferencia por defecto entre unos y otros, solo el fit de habilidades. Si el brief no
aclara el tamaño del equipo, proponé uno razonable según el alcance descripto. Para cada persona elegida
explicá en una frase por qué encaja (qué skill y nivel la hacen apta, o su rol/banda si aplica). Señalá en
"gaps" si el pool no cubre bien alguna necesidad del brief; dejalo vacío si no hay gaps relevantes."""


def build_roster_payload(people_with_skills):
    """people_with_skills: lista de {"persona": {...}, "skills": [...]}"""
    roster = []
    for row in people_with_skills:
        persona = row["persona"]
        skills = row["skills"]
        roster.append({
            "person_id": persona["id"],
            "nombre": persona["nombre"],
            "tipo": persona.get("tipo", "interno"),
            "rol_puesto": persona["rol_puesto"],
            "area": persona["area"],
            "banda": persona["banda"],
            "seniority": persona.get("seniority"),
            "skills": [
                {
                    "nombre": s["nombre"],
                    "categoria": s["categoria"],
                    "nivel_actual": s["nivel_actual"],
                    "nivel_objetivo": s["nivel_objetivo"],
                    "validado": bool(s.get("lider_validacion_fecha")),
                }
                for s in skills
            ],
        })
    return roster


CV_SCHEMA = {
    "type": "object",
    "properties": {
        "resumen": {
            "type": "string",
            "description": "Resumen de 1-2 frases del perfil de la persona según el CV.",
        },
        "skills_detectadas": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "skill_id": {"type": "integer"},
                    "nombre": {"type": "string"},
                    "nivel_estimado": {"type": "integer", "description": "0 a 5, según evidencia en el CV."},
                    "evidencia": {"type": "string", "description": "Frase corta del CV que justifica el nivel."},
                },
                "required": ["skill_id", "nombre", "nivel_estimado", "evidencia"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["resumen", "skills_detectadas"],
    "additionalProperties": False,
}

CV_SYSTEM_PROMPT = """Sos un asistente que lee CVs para armar el perfil de habilidades de freelancers y
partners del ecosistema de DHNN. Se te da el catálogo completo de skills disponibles (con su skill_id) y
el texto de un CV. Detectá qué skills del catálogo esa persona demuestra tener, usando SOLO skill_id que
existan en el catálogo dado (nunca inventes un skill_id ni una skill fuera de esa lista). Para cada skill
detectada, estimá un nivel de 0 a 5 según la evidencia del CV (años de experiencia, seniority de los roles,
tecnologías mencionadas, logros) — sé conservador, no asumas nivel 5 salvo evidencia clara de dominio senior.
Si el CV no da evidencia suficiente de una skill del catálogo, no la incluyas. Citá una frase corta del CV
como evidencia de cada una."""


def extract_skills_from_cv(pdf_base64: str, skills_catalog) -> dict:
    catalog_payload = [
        {"skill_id": s["id"], "nombre": s["nombre"], "categoria": s["categoria"], "tipo": s["tipo"]}
        for s in skills_catalog
    ]
    client = get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        system=CV_SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        output_config={"format": {"type": "json_schema", "schema": CV_SCHEMA}},
        messages=[{
            "role": "user",
            "content": [
                {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": pdf_base64}},
                {"type": "text", "text": f"Catálogo de skills disponibles (JSON):\n{json.dumps(catalog_payload, ensure_ascii=False)}"},
            ],
        }],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)


def suggest_team(brief: str, people_with_skills) -> dict:
    roster = build_roster_payload(people_with_skills)
    client = get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=8000,
        system=SYSTEM_PROMPT,
        thinking={"type": "adaptive"},
        output_config={"format": {"type": "json_schema", "schema": TEAM_SCHEMA}},
        messages=[{
            "role": "user",
            "content": (
                f"Roster disponible (JSON):\n{json.dumps(roster, ensure_ascii=False)}\n\n"
                f"Brief del proyecto:\n{brief}"
            ),
        }],
    )
    text = next(b.text for b in response.content if b.type == "text")
    return json.loads(text)
