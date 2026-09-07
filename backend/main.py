from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from auth import create_token, get_current_user, hash_password, require_admin, verify_password
from db import get_conn

app = FastAPI(title="DHNN Skill Map API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ajustar a un dominio concreto cuando esto salga de desarrollo
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------- helpers

def fetch_person_by_email(cur, email):
    cur.execute("SELECT * FROM people WHERE email = %s", (email,))
    return cur.fetchone()


def fetch_person_skills(cur, person_id):
    cur.execute(
        """
        SELECT ps.id, ps.skill_id, s.nombre, s.categoria, s.tipo, ps.bucket,
               ps.nivel_actual, ps.nivel_objetivo, ps.autoeval_fecha,
               ps.lider_validacion_fecha, ps.lider_ajusto
        FROM person_skills ps
        JOIN skills s ON s.id = ps.skill_id
        WHERE ps.person_id = %s
        ORDER BY ps.bucket, s.categoria, s.nombre
        """,
        (person_id,),
    )
    return cur.fetchall()


def can_view_person(user, target_person_row) -> bool:
    if user["es_admin"]:
        return True
    if user["es_lider"] and target_person_row.get("lider_id") == user["sub"]:
        return True
    return False


# ---------------------------------------------------------------- auth

class LoginBody(BaseModel):
    email: EmailStr
    password: str


@app.post("/auth/login")
def login(body: LoginBody):
    conn = get_conn()
    try:
        cur = conn.cursor()
        person = fetch_person_by_email(cur, body.email.lower())
        if not person:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Ese email no está en el roster de DHNN")

        if person["password_hash"] is None:
            # primer login: la contraseña ingresada queda como la nueva contraseña
            cur.execute(
                "UPDATE people SET password_hash = %s WHERE id = %s",
                (hash_password(body.password), person["id"]),
            )
            conn.commit()
        elif not verify_password(body.password, person["password_hash"]):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Contraseña incorrecta")

        token = create_token(person)
        return {
            "token": token,
            "nombre": person["nombre"],
            "es_lider": person["banda"] in ("Management", "Lead"),
            "es_admin": person["es_admin"],
        }
    finally:
        conn.close()


# ---------------------------------------------------------------- perfil propio

@app.get("/me")
def me(user=Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre, email, rol_puesto, area, banda, seniority, lider_id FROM people WHERE id=%s", (user["sub"],))
        person = cur.fetchone()
        if not person:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Persona no encontrada")
        skills = fetch_person_skills(cur, user["sub"])
        return {"persona": person, "skills": skills}
    finally:
        conn.close()


class AutoevalBody(BaseModel):
    nivel_actual: int


@app.post("/me/skills/{skill_id}/autoeval")
def autoeval(skill_id: int, body: AutoevalBody, user=Depends(get_current_user)):
    if not (0 <= body.nivel_actual <= 5):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "nivel_actual debe estar entre 0 y 5")
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE person_skills SET nivel_actual = %s, autoeval_fecha = CURRENT_DATE
            WHERE person_id = %s AND skill_id = %s
            RETURNING id
            """,
            (body.nivel_actual, user["sub"], skill_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Ese skill no está asignado a tu perfil")
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


# ---------------------------------------------------------------- equipo (líderes + admin)

@app.get("/team")
def team(user=Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        if user["es_admin"]:
            cur.execute("SELECT id, nombre, email, rol_puesto, area, banda, seniority, lider_id FROM people ORDER BY nombre")
        elif user["es_lider"]:
            cur.execute(
                "SELECT id, nombre, email, rol_puesto, area, banda, seniority, lider_id FROM people WHERE lider_id = %s ORDER BY nombre",
                (user["sub"],),
            )
        else:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tenés equipo a cargo")
        people = cur.fetchall()
        for p in people:
            cur.execute(
                """
                SELECT count(*) FILTER (WHERE nivel_actual > 0) AS autoevaluados, count(*) AS total
                FROM person_skills WHERE person_id = %s
                """,
                (p["id"],),
            )
            p.update(cur.fetchone())
        return people
    finally:
        conn.close()


@app.get("/team/{person_id}")
def team_member(person_id: int, user=Depends(get_current_user)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id, nombre, email, rol_puesto, area, banda, seniority, lider_id FROM people WHERE id=%s", (person_id,))
        person = cur.fetchone()
        if not person:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Persona no encontrada")
        if not can_view_person(user, person):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No podés ver a esta persona")
        skills = fetch_person_skills(cur, person_id)
        return {"persona": person, "skills": skills}
    finally:
        conn.close()


class ValidarBody(BaseModel):
    nivel_actual: int
    ajustar: bool = False


@app.post("/team/{person_id}/skills/{skill_id}/validar")
def validar(person_id: int, skill_id: int, body: ValidarBody, user=Depends(get_current_user)):
    if not (0 <= body.nivel_actual <= 5):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "nivel_actual debe estar entre 0 y 5")
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT lider_id FROM people WHERE id=%s", (person_id,))
        person = cur.fetchone()
        if not person:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Persona no encontrada")
        if not can_view_person(user, person):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No podés validar a esta persona")
        cur.execute(
            """
            UPDATE person_skills
            SET lider_validacion_fecha = CURRENT_DATE, lider_ajusto = %s,
                nivel_actual = CASE WHEN %s THEN %s ELSE nivel_actual END
            WHERE person_id = %s AND skill_id = %s
            RETURNING id
            """,
            (body.ajustar, body.ajustar, body.nivel_actual, person_id, skill_id),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Ese skill no está asignado a esa persona")
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


# ---------------------------------------------------------------- admin: personas

class PersonBody(BaseModel):
    nombre: str
    email: EmailStr
    rol_puesto: str
    area: str
    banda: str
    seniority: Optional[str] = None
    lider_id: Optional[int] = None
    es_admin: bool = False
    notas: Optional[str] = None


@app.get("/admin/people")
def admin_list_people(user=Depends(require_admin)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT p.*, l.nombre AS lider_nombre
            FROM people p LEFT JOIN people l ON l.id = p.lider_id
            ORDER BY p.nombre
            """
        )
        rows = cur.fetchall()
        for r in rows:
            r.pop("password_hash", None)
        return rows
    finally:
        conn.close()


@app.post("/admin/people")
def admin_create_person(body: PersonBody, user=Depends(require_admin)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO people (nombre, email, rol_puesto, area, banda, seniority, lider_id, es_admin, notas)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING id
            """,
            (body.nombre, body.email.lower(), body.rol_puesto, body.area, body.banda,
             body.seniority, body.lider_id, body.es_admin, body.notas),
        )
        new_id = cur.fetchone()["id"]
        conn.commit()
        return {"id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    finally:
        conn.close()


@app.put("/admin/people/{person_id}")
def admin_update_person(person_id: int, body: PersonBody, user=Depends(require_admin)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE people SET nombre=%s, email=%s, rol_puesto=%s, area=%s, banda=%s,
                   seniority=%s, lider_id=%s, es_admin=%s, notas=%s
            WHERE id=%s RETURNING id
            """,
            (body.nombre, body.email.lower(), body.rol_puesto, body.area, body.banda,
             body.seniority, body.lider_id, body.es_admin, body.notas, person_id),
        )
        if not cur.fetchone():
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Persona no encontrada")
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@app.delete("/admin/people/{person_id}")
def admin_delete_person(person_id: int, user=Depends(require_admin)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM people WHERE id=%s RETURNING id", (person_id,))
        if not cur.fetchone():
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Persona no encontrada")
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


# ---------------------------------------------------------------- admin: catálogo de skills

class SkillBody(BaseModel):
    nombre: str
    categoria: str
    tipo: str  # 'dura' | 'blanda' | 'ia'


@app.get("/admin/skills")
def admin_list_skills(user=Depends(require_admin)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM skills ORDER BY categoria, nombre")
        return cur.fetchall()
    finally:
        conn.close()


@app.post("/admin/skills")
def admin_create_skill(body: SkillBody, user=Depends(require_admin)):
    if body.tipo not in ("dura", "blanda", "ia"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "tipo debe ser dura, blanda o ia")
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO skills (nombre, categoria, tipo) VALUES (%s,%s,%s) RETURNING id",
            (body.nombre, body.categoria, body.tipo),
        )
        new_id = cur.fetchone()["id"]
        conn.commit()
        return {"id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    finally:
        conn.close()


@app.put("/admin/skills/{skill_id}")
def admin_update_skill(skill_id: int, body: SkillBody, user=Depends(require_admin)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE skills SET nombre=%s, categoria=%s, tipo=%s WHERE id=%s RETURNING id",
            (body.nombre, body.categoria, body.tipo, skill_id),
        )
        if not cur.fetchone():
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Skill no encontrado")
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@app.delete("/admin/skills/{skill_id}")
def admin_delete_skill(skill_id: int, user=Depends(require_admin)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM skills WHERE id=%s RETURNING id", (skill_id,))
        if not cur.fetchone():
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Skill no encontrado")
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


# ---------------------------------------------------------------- admin: asignar/editar tareas (skills por persona)

class AssignSkillBody(BaseModel):
    skill_id: int
    bucket: str  # 'core' | 'blandas' | 'desarrollar'
    nivel_objetivo: int = 3


@app.get("/admin/people/{person_id}/skills")
def admin_person_skills(person_id: int, user=Depends(require_admin)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        return fetch_person_skills(cur, person_id)
    finally:
        conn.close()


@app.post("/admin/people/{person_id}/skills")
def admin_assign_skill(person_id: int, body: AssignSkillBody, user=Depends(require_admin)):
    if body.bucket not in ("core", "blandas", "desarrollar"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "bucket debe ser core, blandas o desarrollar")
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO person_skills (person_id, skill_id, bucket, nivel_objetivo)
            VALUES (%s,%s,%s,%s)
            ON CONFLICT (person_id, skill_id) DO UPDATE SET bucket=EXCLUDED.bucket, nivel_objetivo=EXCLUDED.nivel_objetivo
            RETURNING id
            """,
            (person_id, body.skill_id, body.bucket, body.nivel_objetivo),
        )
        new_id = cur.fetchone()["id"]
        conn.commit()
        return {"id": new_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))
    finally:
        conn.close()


class ModifyAssignBody(BaseModel):
    bucket: str
    nivel_objetivo: int


@app.put("/admin/people/{person_id}/skills/{skill_id}")
def admin_modify_assign(person_id: int, skill_id: int, body: ModifyAssignBody, user=Depends(require_admin)):
    if body.bucket not in ("core", "blandas", "desarrollar"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "bucket debe ser core, blandas o desarrollar")
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE person_skills SET bucket=%s, nivel_objetivo=%s WHERE person_id=%s AND skill_id=%s RETURNING id",
            (body.bucket, body.nivel_objetivo, person_id, skill_id),
        )
        if not cur.fetchone():
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Asignación no encontrada")
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@app.delete("/admin/people/{person_id}/skills/{skill_id}")
def admin_remove_assign(person_id: int, skill_id: int, user=Depends(require_admin)):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "DELETE FROM person_skills WHERE person_id=%s AND skill_id=%s RETURNING id",
            (person_id, skill_id),
        )
        if not cur.fetchone():
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Asignación no encontrada")
        conn.commit()
        return {"ok": True}
    finally:
        conn.close()


@app.get("/health")
def health():
    return {"status": "ok"}
