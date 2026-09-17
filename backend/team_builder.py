"""Armado de equipos con IA: dado un brief de proyecto y el roster con sus
habilidades, le pide a Claude que arme una propuesta de equipo usando
solamente personas que existen en el roster (referenciadas por person_id)."""

import json
import os

import anthropic

from db import load_env

load_env()

MODEL = "claude-opus-5"

_client = None


def get_client():
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
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
                    "rol_en_equipo": {"type": "string"},
                    "justificacion": {"type": "string"},
                },
                "required": ["person_id", "nombre", "rol_en_equipo", "justificacion"],
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
1. El roster completo de personas disponibles, con sus habilidades y el nivel actual en cada una (escala 0 a 5,
   0 = sin autoevaluar, 5 = maestro). Cuando una habilidad fue validada por el líder de la persona es más
   confiable que una autoevaluación sin validar (campo "validado").
2. Un brief de proyecto en texto libre, escrito por un administrador.

Elegí las personas del roster (usando exactamente su person_id, nunca inventes personas que no estén en la
lista) que mejor cubran lo que pide el brief, priorizando nivel_actual alto en las skills relevantes y, a
igual nivel, las validadas por un líder. Si el brief no aclara el tamaño del equipo, proponé uno razonable
según el alcance descripto. Para cada persona elegida explicá en una frase por qué encaja (qué skill y nivel
la hacen apta, o su rol/banda si aplica). Señalá en "gaps" si el roster no cubre bien alguna necesidad del
brief; dejalo vacío si no hay gaps relevantes."""


def build_roster_payload(people_with_skills):
    """people_with_skills: lista de {"persona": {...}, "skills": [...]}"""
    roster = []
    for row in people_with_skills:
        persona = row["persona"]
        skills = row["skills"]
        roster.append({
            "person_id": persona["id"],
            "nombre": persona["nombre"],
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
