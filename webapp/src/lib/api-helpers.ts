import { NextResponse } from "next/server";
import { ApiError, type TokenUser } from "./auth";
import { query } from "./db";

export function handleError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ detail: err.message }, { status: err.status });
  }
  console.error(err);
  const message = err instanceof Error ? err.message : "Error interno";
  return NextResponse.json({ detail: message }, { status: 500 });
}

export async function fetchPersonSkills(personId: number) {
  return query(
    `SELECT ps.id, ps.skill_id, s.nombre, s.categoria, s.tipo, ps.bucket,
            ps.nivel_actual, ps.nivel_objetivo, ps.autoeval_fecha,
            ps.lider_validacion_fecha, ps.lider_ajusto
     FROM person_skills ps
     JOIN skills s ON s.id = ps.skill_id
     WHERE ps.person_id = $1 AND s.activo
     ORDER BY ps.bucket, s.categoria, s.nombre`,
    [personId]
  );
}

interface PersonLike {
  lider_id?: number | null;
}

export function canViewPerson(user: TokenUser, targetPerson: PersonLike): boolean {
  if (user.es_admin) return true;
  if (user.es_lider && targetPerson.lider_id === user.sub) return true;
  return false;
}
