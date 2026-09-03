#!/usr/bin/env python3
"""Migra el roster real y la estructura de skills (preview.html) a Postgres.
Re-derivable: relee preview.html + roster_DRAFT.csv cada vez que corre,
así que es seguro re-ejecutarlo si esos archivos cambian (usa upsert).
Corre con el usuario de la app (skillmapuser) — valida que sus permisos
alcancen para el uso normal, no solo el usuario admin.
"""
import csv
import json
import os
import re

import psycopg2

HERE = os.path.dirname(os.path.abspath(__file__))


def load_env():
    with open(os.path.join(HERE, ".env")) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            os.environ.setdefault(key, val.strip('"'))


def js_to_json(fragment, wrapper=("", "")):
    text = wrapper[0] + fragment + wrapper[1]
    text = re.sub(r"(?<=[{,\s])(\w+)\s*:", r'"\1":', text)
    text = re.sub(r"'([^']*)'", r'"\1"', text)
    text = re.sub(r",\s*([}\]])", r"\1", text)
    return json.loads(text)


def extract_preview_data():
    with open(os.path.join(HERE, "preview.html")) as f:
        html = f.read()

    def block(start_marker, end_marker):
        start = html.index(start_marker) + len(start_marker)
        end = html.index(end_marker, start)
        return html[start:end]

    role_skills = js_to_json(block("const ROLE_SKILLS = {", "\n};"), ("{", "}"))
    curve_design = js_to_json(block("const CURVE_DESIGN = [", "\n];"), ("[", "]"))
    curve_pm = js_to_json(block("const CURVE_PM = [", "\n];"), ("[", "]"))
    ia_line = re.search(r"const IA_SKILLS = (\[.*?\]);", html).group(1)
    ia_skills = js_to_json(ia_line)
    return role_skills, curve_design, curve_pm, ia_skills


def load_roster():
    people = []
    with open(os.path.join(HERE, "roster_DRAFT.csv")) as f:
        for row in csv.DictReader(f):
            people.append({
                "nombre": row["nombre"].strip(),
                "email": row["email"].strip() or None,
                "rol_puesto": row["rol_puesto"].strip(),
                "area": row["area"].strip(),
                "banda": row["banda"].strip(),
                "seniority": row["seniority"].strip() or None,
                "lider": row["lider"].strip() or None,
                "notas": row["notas"].strip() or None,
            })
    return people


LEADER_BANDAS = {"Management", "Lead"}
PM_TRACK_BANDAS = {"PM", "Management", "Lead"}


def target_for(p):
    if p["seniority"] in ("Sr", "Líder") or p["banda"] in LEADER_BANDAS:
        return 5
    if p["seniority"] == "Ssr":
        return 4
    return 3


def person_level(p):
    if p["seniority"] == "Líder" or p["banda"] in LEADER_BANDAS:
        return 4
    if p["seniority"] == "Sr":
        return 3
    if p["seniority"] == "Ssr":
        return 2
    return 1


def build_skills(p, role_skills, curve_design, curve_pm, ia_skills):
    """Replica buildSkills() de preview.html — misma lógica, mismo resultado."""
    target = target_for(p)
    lvl = person_level(p)
    curve = curve_pm if p["banda"] in PM_TRACK_BANDAS else curve_design
    role_items = role_skills.get(p["nombre"], [])
    skills = []

    for s in role_items:
        skills.append({
            "nombre": s["name"], "categoria": p["area"], "tipo": "dura",
            "bucket": "core" if s.get("core") else "desarrollar",
            "nivel_objetivo": target,
        })

    for s in curve:
        if s["lvl"] <= lvl:
            bucket = "blandas"
        elif s["lvl"] == lvl + 1:
            bucket = "desarrollar"
        else:
            continue
        skills.append({
            "nombre": s["name"], "categoria": "Habilidades blandas", "tipo": "blanda",
            "bucket": bucket, "nivel_objetivo": target,
        })

    for name in ia_skills:
        skills.append({
            "nombre": name, "categoria": "IA & Automatización", "tipo": "ia",
            "bucket": "desarrollar", "nivel_objetivo": target,
        })

    return skills


def main():
    load_env()
    url = os.environ["DATABASE_URL_skillmapuser"].split("?")[0]
    role_skills, curve_design, curve_pm, ia_skills = extract_preview_data()
    roster = load_roster()

    conn = psycopg2.connect(url)
    cur = conn.cursor()

    # 1) personas (sin lider_id todavía, se resuelve en una segunda pasada)
    name_to_id = {}
    for p in roster:
        cur.execute(
            """
            INSERT INTO people (nombre, email, rol_puesto, area, banda, seniority, notas)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (nombre) DO UPDATE SET
              email = EXCLUDED.email, rol_puesto = EXCLUDED.rol_puesto,
              area = EXCLUDED.area, banda = EXCLUDED.banda,
              seniority = EXCLUDED.seniority, notas = EXCLUDED.notas
            RETURNING id
            """,
            (p["nombre"], p["email"], p["rol_puesto"], p["area"], p["banda"], p["seniority"], p["notas"]),
        )
        name_to_id[p["nombre"]] = cur.fetchone()[0]

    # 2) resolver lider_id ahora que todos existen
    for p in roster:
        if p["lider"] and p["lider"] in name_to_id:
            cur.execute(
                "UPDATE people SET lider_id = %s WHERE id = %s",
                (name_to_id[p["lider"]], name_to_id[p["nombre"]]),
            )
        elif p["lider"]:
            print(f"  aviso: líder '{p['lider']}' de {p['nombre']} no está en el roster")

    # 3) skills + person_skills, computados igual que buildSkills() en preview.html
    skill_cache = {}
    total_assignments = 0
    for p in roster:
        person_id = name_to_id[p["nombre"]]
        for s in build_skills(p, role_skills, curve_design, curve_pm, ia_skills):
            key = (s["nombre"], s["categoria"])
            skill_id = skill_cache.get(key)
            if skill_id is None:
                cur.execute(
                    """
                    INSERT INTO skills (nombre, categoria, tipo) VALUES (%s, %s, %s)
                    ON CONFLICT (nombre, categoria) DO UPDATE SET tipo = EXCLUDED.tipo
                    RETURNING id
                    """,
                    (s["nombre"], s["categoria"], s["tipo"]),
                )
                skill_id = cur.fetchone()[0]
                skill_cache[key] = skill_id

            cur.execute(
                """
                INSERT INTO person_skills (person_id, skill_id, bucket, nivel_objetivo)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (person_id, skill_id) DO UPDATE SET
                  bucket = EXCLUDED.bucket, nivel_objetivo = EXCLUDED.nivel_objetivo
                """,
                (person_id, skill_id, s["bucket"], s["nivel_objetivo"]),
            )
            total_assignments += 1

    conn.commit()

    cur.execute("SELECT count(*) FROM people")
    n_people = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM skills")
    n_skills = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM person_skills")
    n_person_skills = cur.fetchone()[0]
    print(f"OK — people={n_people} skills={n_skills} person_skills={n_person_skills} (asignaciones procesadas: {total_assignments})")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
