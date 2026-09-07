#!/usr/bin/env python3
"""Crea datos de prueba SINTÉTICOS (no personas reales) para poder probar
el backend de punta a punta: un admin/líder de prueba y un 'reporte' de
prueba, cada uno con un par de skills asignadas. Seguro de re-correr.
"""
import sys

sys.path.insert(0, ".")
from db import get_conn  # noqa: E402


def upsert_person(cur, **fields):
    cols = list(fields.keys())
    cur.execute(
        f"""
        INSERT INTO people ({', '.join(cols)})
        VALUES ({', '.join(['%s'] * len(cols))})
        ON CONFLICT (nombre) DO UPDATE SET
          {', '.join(f'{c} = EXCLUDED.{c}' for c in cols if c != 'nombre')}
        RETURNING id
        """,
        list(fields.values()),
    )
    return cur.fetchone()["id"]


def main():
    conn = get_conn()
    cur = conn.cursor()

    test_id = upsert_person(
        cur,
        nombre="Test Usuario",
        email="test@dhnn.com",
        rol_puesto="Test (admin/líder ficticio)",
        area="Test",
        banda="Lead",
        seniority="Líder",
        es_admin=True,
    )
    report_id = upsert_person(
        cur,
        nombre="Test Reporte",
        email="test.reporte@dhnn.com",
        rol_puesto="Test (reporte ficticio)",
        area="Test",
        banda="Diseñador",
        seniority="Ssr",
        lider_id=test_id,
        es_admin=False,
    )

    # un par de skills existentes del catálogo para poder ejercitar autoeval/validación
    cur.execute("SELECT id FROM skills ORDER BY id LIMIT 3")
    skill_ids = [r["id"] for r in cur.fetchall()]

    for pid in (test_id, report_id):
        for i, sid in enumerate(skill_ids):
            bucket = ["core", "blandas", "desarrollar"][i % 3]
            cur.execute(
                """
                INSERT INTO person_skills (person_id, skill_id, bucket, nivel_objetivo)
                VALUES (%s, %s, %s, 3)
                ON CONFLICT (person_id, skill_id) DO UPDATE SET bucket = EXCLUDED.bucket
                """,
                (pid, sid, bucket),
            )

    conn.commit()
    print(f"Test Usuario id={test_id} (admin+líder), Test Reporte id={report_id} (reporta a Test Usuario)")
    print(f"Skills de prueba asignadas: {skill_ids}")
    conn.close()


if __name__ == "__main__":
    main()
