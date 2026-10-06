import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { ApiError, getCurrentUser } from "@/lib/auth";
import { handleError } from "@/lib/api-helpers";

export async function GET(request: Request) {
  try {
    const user = getCurrentUser(request);
    let people;
    if (user.es_admin) {
      people = await query(
        "SELECT id, nombre, email, rol_puesto, area, banda, seniority, lider_id, tipo FROM people ORDER BY nombre"
      );
    } else if (user.es_lider) {
      people = await query(
        "SELECT id, nombre, email, rol_puesto, area, banda, seniority, lider_id, tipo FROM people WHERE lider_id = $1 ORDER BY nombre",
        [user.sub]
      );
    } else {
      throw new ApiError(403, "No tenés equipo a cargo");
    }
    for (const p of people as Array<Record<string, unknown>>) {
      const counts = await queryOne<{ autoevaluados: string; total: string }>(
        `SELECT count(*) FILTER (WHERE ps.nivel_actual > 0) AS autoevaluados, count(*) AS total
         FROM person_skills ps
         JOIN skills s ON s.id = ps.skill_id
         WHERE ps.person_id = $1 AND s.activo`,
        [p.id]
      );
      p.autoevaluados = Number(counts?.autoevaluados ?? 0);
      p.total = Number(counts?.total ?? 0);
    }
    return NextResponse.json(people);
  } catch (err) {
    return handleError(err);
  }
}
